// @ts-nocheck
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import AppError from "../errors/AppError";
import ListKnowledgeBasesService from "../services/KnowledgeBaseService/ListKnowledgeBasesService";
import ShowKnowledgeBaseService from "../services/KnowledgeBaseService/ShowKnowledgeBaseService";
import CreateKnowledgeBaseService from "../services/KnowledgeBaseService/CreateKnowledgeBaseService";
import UpdateKnowledgeBaseService from "../services/KnowledgeBaseService/UpdateKnowledgeBaseService";
import DeleteKnowledgeBaseService from "../services/KnowledgeBaseService/DeleteKnowledgeBaseService";
import AddItemService from "../services/KnowledgeBaseService/AddItemService";
import DeleteItemService from "../services/KnowledgeBaseService/DeleteItemService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const bases = await ListKnowledgeBasesService(companyId);
  return res.json(bases);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const kb = await ShowKnowledgeBaseService(id, companyId);
  return res.json(kb);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, description } = req.body;
  const kb = await CreateKnowledgeBaseService({ name, description, companyId });
  return res.status(201).json(kb);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);
  const { name, description } = req.body;
  const kb = await UpdateKnowledgeBaseService({ id, companyId, name, description });
  return res.json(kb);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const id = Number(req.params.id);
  await DeleteKnowledgeBaseService(id, companyId);
  return res.status(200).json({ message: "Deletado com sucesso" });
};

export const addItem = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const knowledgeBaseId = Number(req.params.id);
  const { type, title, content, url } = req.body;

  let filePath: string | undefined;
  let mimeType: string | undefined;
  let fileSize: number | undefined;

  if (req.file) {
    const publicDir = path.resolve(__dirname, "..", "..", "public", `company${companyId}`, "knowledge");
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    const dest = path.join(publicDir, req.file.originalname);
    fs.renameSync(req.file.path, dest);
    filePath = `company${companyId}/knowledge/${req.file.originalname}`;
    mimeType = req.file.mimetype;
    fileSize = req.file.size;
  }

  const item = await AddItemService({
    knowledgeBaseId,
    companyId,
    type: type || (req.file ? (req.file.mimetype.includes("pdf") ? "pdf" : "image") : "text"),
    title,
    content,
    url,
    filePath,
    mimeType,
    fileSize
  });

  return res.status(201).json(item);
};

export const removeItem = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const itemId = Number(req.params.itemId);
  await DeleteItemService(itemId, companyId);
  return res.status(200).json({ message: "Item removido" });
};
