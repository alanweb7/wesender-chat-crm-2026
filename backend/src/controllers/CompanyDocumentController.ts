import { Request, Response } from "express";
import { verify } from "jsonwebtoken";
import authConfig from "../config/auth";
import AppError from "../errors/AppError";
import CompanyDocument from "../models/CompanyDocument";
import Company from "../models/Company";
import User from "../models/User";
import {
  CreateCompanyDocumentService,
  UpdateCompanyDocumentService,
  DeleteCompanyDocumentService,
  ListCompanyDocumentsService,
  ShowCompanyDocumentService,
} from "../services/CompanyDocumentService";
import path from "path";
import fs from "fs";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  companyId?: string;
};

type StoreDocumentData = {
  companyId: number;
  name: string;
  visible?: boolean;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber, companyId } = req.query as IndexQuery;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId: requestCompanyId, profile } = decoded as TokenPayload;

  // Verificar se é admin/superadmin ou se está solicitando documentos da própria empresa
  if (profile !== "admin" && companyId && companyId !== requestCompanyId.toString()) {
    throw new AppError("ERR_PERMISSION_DENIED", 403);
  }

  const targetCompanyId = companyId ? parseInt(companyId) : requestCompanyId;

  const documents = await ListCompanyDocumentsService({
    searchParam,
    pageNumber,
    companyId: targetCompanyId,
    requestCompanyId,
    profile
  });

  return res.status(200).json(documents);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret) as any;
  const { companyId: requestCompanyId, profile } = decoded as TokenPayload;

  // Apenas admin/superadmin pode fazer upload
  if (profile !== "admin") {
    throw new AppError("ERR_PERMISSION_DENIED", 403);
  }

  // Verificar se o usuário pertence à empresa ID 1
  if (requestCompanyId !== 1) {
    throw new AppError("ERR_ONLY_COMPANY_1_CAN_UPLOAD", 403);
  }

  const { companyId, name, visible } = req.body as StoreDocumentData;

  // Verificar se a empresa existe
  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  if (!req.file) {
    throw new AppError("ERR_NO_FILE_UPLOADED", 400);
  }

  const document = await CreateCompanyDocumentService({
    companyId,
    name,
    filePath: req.file.path,
    fileName: req.file.originalname,
    visible: visible || false,
  });

  return res.status(201).json(document);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId: requestCompanyId, profile } = decoded as TokenPayload;

  const document = await ShowCompanyDocumentService({
    documentId: parseInt(id),
    requestCompanyId,
    profile
  });

  return res.status(200).json(document);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId: requestCompanyId, profile } = decoded as TokenPayload;

  // Apenas admin/superadmin pode atualizar
  if (profile !== "admin") {
    throw new AppError("ERR_PERMISSION_DENIED", 403);
  }

  // Verificar se o usuário pertence à empresa ID 1
  if (requestCompanyId !== 1) {
    throw new AppError("ERR_ONLY_COMPANY_1_CAN_UPLOAD", 403);
  }

  const { name, description, isVisibleToCompany } = req.body;

  const document = await UpdateCompanyDocumentService({
    documentId: parseInt(id),
    name,
    description,
    isVisibleToCompany
  });

  return res.status(200).json(document);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId: requestCompanyId, profile } = decoded as TokenPayload;

  // Apenas admin/superadmin pode excluir
  if (profile !== "admin") {
    throw new AppError("ERR_PERMISSION_DENIED", 403);
  }

  // Verificar se o usuário pertence à empresa ID 1
  if (requestCompanyId !== 1) {
    throw new AppError("ERR_ONLY_COMPANY_1_CAN_UPLOAD", 403);
  }

  await DeleteCompanyDocumentService(parseInt(id));

  return res.status(204).send();
};

export const download = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId: requestCompanyId, profile } = decoded as TokenPayload;

  const document = await ShowCompanyDocumentService({
    documentId: parseInt(id),
    requestCompanyId,
    profile
  });

  // Verificar se o arquivo existe
  if (!fs.existsSync(document.filePath)) {
    throw new AppError("ERR_FILE_NOT_FOUND", 404);
  }

  // Configurar headers para download
  res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  // Enviar o arquivo
  const fileStream = fs.createReadStream(document.filePath);
  fileStream.pipe(res);

  return new Promise((resolve) => {
    fileStream.on('end', () => {
      resolve(res.status(200));
    });
  });
};
