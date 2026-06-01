import { Request, Response } from "express";
import CreateService from "../services/RatingConfigServices/CreateService";
import ListService from "../services/RatingConfigServices/ListService";
import ShowService from "../services/RatingConfigServices/ShowService";
import UpdateService from "../services/RatingConfigServices/UpdateService";
import DeleteService from "../services/RatingConfigServices/DeleteService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, pageNumber } = req.query as { searchParam?: string; pageNumber?: string };

  const { records, count, hasMore } = await ListService({ companyId, searchParam, pageNumber });

  return res.json({ records, count, hasMore });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const record = await ShowService(id, companyId);

  return res.json(record);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { name, message, type, options } = req.body;

  const record = await CreateService({ name, message, type, companyId, options });

  return res.status(201).json(record);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { name, message, type, options } = req.body;

  const record = await UpdateService({ id, companyId, name, message, type, options });

  return res.json(record);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  await DeleteService(id, companyId);

  return res.json({ message: "Rating config deleted" });
};
