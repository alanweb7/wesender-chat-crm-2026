import path from "path";
import multer from "multer";
import fs from "fs";
import Whatsapp from "../models/Whatsapp";
import { isEmpty, isNil } from "lodash";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

const ALLOWED_MIME_TYPES = new Set([
  // Imagens
  "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
  "image/svg+xml", "image/bmp",
  // Vídeos
  "video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/3gpp",
  // Áudios
  "audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/webm",
  "audio/aac", "audio/opus",
  // Documentos
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "text/plain", "text/csv",
]);

export default {
  directory: publicFolder,
  fileFilter(req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
    }
  },
  storage: multer.diskStorage({
    destination: async function (req, file, cb) {

      let companyId;
      companyId = req.user?.companyId
      const { typeArch, fileId } = req.body;

      if (companyId === undefined && isNil(companyId) && isEmpty(companyId)) {
        const authHeader = req.headers.authorization;
        const [, token] = authHeader.split(" ");
        const whatsapp = await Whatsapp.findOne({ where: { token } });
        companyId = whatsapp.companyId;
      }
      let folder;

      if (typeArch && typeArch !== "announcements" && typeArch !== "logo" && typeArch !== "terms" && typeArch !== "dashboard") {
        folder = path.resolve(publicFolder, `company${companyId}`, typeArch, fileId ? fileId : "")
      } else if (typeArch && typeArch === "announcements") {
        folder = path.resolve(publicFolder, typeArch)
      } else if (typeArch === "logo" || typeArch === "terms" || typeArch === "dashboard") {
        folder = path.resolve(publicFolder)
      }
      else {
        folder = path.resolve(publicFolder, `company${companyId}`)
      }

      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        fs.chmodSync(folder, 0o755);
      }
      return cb(null, folder);
    },
    filename(req, file, cb) {
      const { typeArch, mode } = req.body;

      let fileName;

      if (typeArch === "dashboard" && mode) {
        fileName = `dashboard-image-${mode}.png`;
      } else if (typeArch && typeArch === "announcements") {
        fileName = new Date().getTime() + '_' + file.originalname.replace('/', '-').replace(/ /g, "_");
      } else {
        fileName = file.originalname.replace('/', '-').replace(/ /g, "_");
      }

      return cb(null, fileName);
    }
  })
};
