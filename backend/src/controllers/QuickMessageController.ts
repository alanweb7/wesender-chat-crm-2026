import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListService from "../services/QuickMessageService/ListService";
import CreateService from "../services/QuickMessageService/CreateService";
import ShowService from "../services/QuickMessageService/ShowService";
import UpdateService from "../services/QuickMessageService/UpdateService";
import DeleteService from "../services/QuickMessageService/DeleteService";
import FindService from "../services/QuickMessageService/FindService";

import QuickMessage from "../models/QuickMessage";
import { head } from "lodash";
import fs from "fs";
import path from "path";

import AppError from "../errors/AppError";

// Tipos de arquivo permitidos por categoria
const ALLOWED_MEDIA_TYPES = {
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
  video: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv', '.wmv'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.opus', '.flac'],
  document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.xml', '.zip', '.rar']
};

// Função para detectar o tipo de mídia baseado na extensão
const detectMediaType = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase();
  
  for (const [type, extensions] of Object.entries(ALLOWED_MEDIA_TYPES)) {
    if (extensions.includes(ext)) {
      return type;
    }
  }
  
  return 'document'; // fallback para documentos
};

// Função para validar se o arquivo é permitido
const isFileAllowed = (filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  const allAllowedExtensions = Object.values(ALLOWED_MEDIA_TYPES).flat();
  return allAllowedExtensions.includes(ext);
};

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  userId: string | number;
};

type StoreData = {
  shortcode: string;
  message: string;
  userId: number | number;
  mediaPath?: string;
  mediaName?: string;
  geral: boolean;
  isMedia: boolean;
  visao: boolean;
};

type FindParams = {
  companyId: string;
  userId: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId, id: userId } = req.user;

  const { records, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId,
    userId
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as StoreData;



  const schema = Yup.object().shape({
    shortcode: Yup.string().required(),
    message: data.isMedia ? Yup.string().notRequired() : Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const record = await CreateService({
    ...data,
    companyId,
    userId: req.user.id
  });

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-quickmessage`, {
    action: "create",
    record
  });

  return res.status(200).json(record);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const record = await ShowService(id);

  return res.status(200).json(record);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body as StoreData;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    shortcode: Yup.string().required(),
    message: data.isMedia ? Yup.string().notRequired() : Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;

  const record = await UpdateService({
    ...data,
    userId: req.user.id,
    id,
  });

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-quickmessage`, {
    action: "update",
    record
  });

  return res.status(200).json(record);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteService(id);

  const io = getIO();
  io.of(String(companyId))
  .emit(`company-${companyId}-quickmessage`, {
    action: "delete",
    id
  });

  return res.status(200).json({ message: "Contact deleted" });
};

export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const params = req.query as FindParams;
  const records: QuickMessage[] = await FindService(params);

  return res.status(200).json(records);
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    // Validar se o tipo de arquivo é permitido
    if (!isFileAllowed(file.originalname)) {
      throw new AppError("Tipo de arquivo não permitido. Formatos aceitos: imagens, vídeos, áudios, PDF, planilhas e documentos.");
    }

    const quickmessage = await QuickMessage.findByPk(id);
    
    // Detectar automaticamente o tipo de mídia
    const mediaType = detectMediaType(file.originalname);
    
    await quickmessage.update ({
      mediaPath: file.filename,
      mediaName: file.originalname,
      mediaType: mediaType
    });

    return res.send({ 
      mensagem: "Arquivo Anexado",
      mediaType: mediaType
    });
    } catch (err: any) {
      throw new AppError(err.message);
  }
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user

  try {
    const quickmessage = await QuickMessage.findByPk(id);
    const filePath = path.resolve("public", `company${companyId}`,"quickMessage",quickmessage.mediaName);
    const fileExists = fs.existsSync(filePath);
    if (fileExists) {
      fs.unlinkSync(filePath);
    }
    await quickmessage.update ({
      mediaPath: null,
      mediaName: null,
      mediaType: null
    });

    return res.send({ mensagem: "Arquivo Excluído" });
    } catch (err: any) {
      throw new AppError(err.message);
  }
};
