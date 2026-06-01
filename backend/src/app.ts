import "./bootstrap";
import "reflect-metadata";
import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import * as Sentry from "@sentry/node";
import { config as dotenvConfig } from "dotenv";
import bodyParser from 'body-parser';
import { verify } from "jsonwebtoken";
import authConfig from "./config/auth";

import "./database";
import uploadConfig from "./config/upload";
import { ValidationError, DatabaseError, ForeignKeyConstraintError } from "sequelize";
import AppError from "./errors/AppError";
import routes from "./routes";
import * as WhatsappWidgetController from "./controllers/WhatsappWidgetController";
import logger from "./utils/logger";
import { messageQueue, sendScheduledMessages } from "./queues";
import BullQueue from "./libs/queue"
import BullBoard from 'bull-board';
import basicAuth from 'basic-auth';
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// Função de middleware para autenticação básica
export const isBullAuth = (req, res, next) => {
  const user = basicAuth(req);

  if (!user || user.name !== process.env.BULL_USER || user.pass !== process.env.BULL_PASS) {
    res.set('WWW-Authenticate', 'Basic realm="example"');
    return res.status(401).send('Authentication required.');
  }
  next();
};

// Carregar variáveis de ambiente
dotenvConfig();

// Inicializar Sentry
Sentry.init({ dsn: process.env.SENTRY_DSN });

const app = express();

// Configuração de filas
app.set("queues", {
  messageQueue,
  sendScheduledMessages
});

// Configuração do BullBoard
if (String(process.env.BULL_BOARD).toLocaleLowerCase() === 'true' && process.env.REDIS_URI_ACK !== '') {
  BullBoard.setQueues(BullQueue.queues.map(queue => queue && queue.bull));
  app.use('/admin/queues', isBullAuth, BullBoard.UI);
}


app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false }));
app.use(compression());
app.use(bodyParser.json({
  limit: '50mb',
  verify: (req: any, _res, buf) => { req.rawBody = buf; }
}));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(
  cors({
    credentials: true,
    origin: process.env.FRONTEND_URL || false
  })
);
app.use(cookieParser());
app.use(express.json());
app.use(Sentry.Handlers.requestHandler());
// Middleware de autenticação para arquivos de empresa em /public/company{id}/
// Caminhos sem companyId (logo, announcements, etc.) ficam públicos
const publicFileAuth = (req: Request, res: Response, next: NextFunction): void => {
  const match = req.path.match(/^\/company(\d+)\//);
  if (!match) return next(); // caminho não é de empresa — público

  // Pastas de assets visuais são públicas — carregadas via <img src> sem token
  const PUBLIC_SUBFOLDERS = ["/profile/", "/slider/", "/user/", "/campaign/"];
  if (PUBLIC_SUBFOLDERS.some(folder => req.path.includes(folder))) return next();

  // Extensões de imagem na raiz da pasta da empresa também são públicas
  if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(req.path)) return next();

  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;
  const token = authHeader?.split(" ")[1] || queryToken;

  if (!token) {
    res.status(401).send("Unauthorized");
    return;
  }

  try {
    const decoded = verify(token, authConfig.secret) as any;
    const requestedCompanyId = parseInt(match[1], 10);
    if (decoded.companyId !== requestedCompanyId) {
      res.status(403).send("Forbidden");
      return;
    }
    next();
  } catch {
    res.status(401).send("Unauthorized");
  }
};

app.use("/public", publicFileAuth, express.static(uploadConfig.directory, {
  maxAge: '1h',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (/\.(jpg|jpeg|png|gif|webp)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Middleware para evitar cache nas respostas da API
app.use((req: Request, res: Response, next: NextFunction) => {
  // Não cachear respostas da API
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Rotas públicas do widget WhatsApp — devem vir ANTES do roteador principal
// para nunca passarem por nenhum middleware de autenticação
app.get("/w/:code/embed.js", WhatsappWidgetController.embedScript);
app.post("/w/:code/click", WhatsappWidgetController.trackClick);
app.options("/w/:code/click", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.status(204).send();
});

// Rotas
app.use(routes);

// Manipulador de erros do Sentry
app.use(Sentry.Handlers.errorHandler());

// Middleware de tratamento de erros
app.use(async (err: Error, req: Request, res: Response, _: NextFunction) => {
  // Verificar se headers já foram enviados
  if (res.headersSent) {
    return;
  }

  const formatFieldName = (field?: string) => {
    if (!field) return "campo obrigatório";
    return field
      .replace(/_/g, " ")
      .replace(/\b\w/g, match => match.toUpperCase());
  };

  if (err instanceof ValidationError) {
    const messages = err.errors.map(error => error.message || `Campo '${error.path}' inválido.`);
    logger.warn(err);
    return res.status(400).json({ error: messages[0], errors: messages });
  }

  if (err instanceof ForeignKeyConstraintError) {
    logger.warn(err);
    return res.status(400).json({
      error: "Alguma informação relacionada não foi encontrada ou é inválida. Verifique os dados enviados."
    });
  }

  if (err instanceof DatabaseError) {
    const pgCode = (err.parent as any)?.code;
    const column = (err.parent as any)?.column;

    if (pgCode === "23502") {
      logger.warn(err);
      return res.status(400).json({
        error: `O campo '${formatFieldName(column)}' é obrigatório.`
      });
    }

    if (pgCode === "23505") {
      logger.warn(err);
      return res.status(400).json({
        error: "Já existe um registro com essas informações. Ajuste os dados e tente novamente."
      });
    }
  }

  if (err instanceof AppError) {
    logger.warn(err);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

export default app;
