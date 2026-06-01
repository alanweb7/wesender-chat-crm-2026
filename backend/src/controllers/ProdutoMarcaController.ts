import { Request, Response } from "express";
import CreateService from "../services/ProdutoMarcaService/CreateService";
import ListService from "../services/ProdutoMarcaService/ListService";
import ShowService from "../services/ProdutoMarcaService/ShowService";
import UpdateService from "../services/ProdutoMarcaService/UpdateService";
import DeleteService from "../services/ProdutoMarcaService/DeleteService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const marcas = await ListService({ companyId });
  return res.json(marcas);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { nome, descricao, logo, active } = req.body;

  const marca = await CreateService({ companyId, nome, descricao, logo, active });
  return res.status(201).json(marca);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { marcaId } = req.params;

  const marca = await ShowService({ id: marcaId, companyId });
  return res.json(marca);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { marcaId } = req.params;
  const { nome, descricao, logo, active } = req.body;

  const marca = await UpdateService({
    id: marcaId,
    companyId,
    nome,
    descricao,
    logo,
    active
  });

  return res.json(marca);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { marcaId } = req.params;

  await DeleteService({ id: marcaId, companyId });
  return res.json({ message: "Marca removida" });
};

export const uploadLogo = async (req: Request, res: Response): Promise<Response> => {
  const file = req.file as Express.Multer.File | undefined;

  if (!file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado" });
  }

  const { companyId } = req.user;

  const relativePath = `company${companyId}/marcas/${file.filename}`;

  return res.status(200).json({ filename: relativePath });
};
