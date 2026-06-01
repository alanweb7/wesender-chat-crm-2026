import { Request, Response } from "express";
import CreateService from "../services/ProdutoCustomFieldService/CreateService";
import ListService from "../services/ProdutoCustomFieldService/ListService";
import ShowService from "../services/ProdutoCustomFieldService/ShowService";
import UpdateService from "../services/ProdutoCustomFieldService/UpdateService";
import DeleteService from "../services/ProdutoCustomFieldService/DeleteService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const fields = await ListService({ companyId });
  return res.json(fields);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { nome, chave, tipo, opcoes, obrigatorio, ordem } = req.body;

  const field = await CreateService({ companyId, nome, chave, tipo, opcoes, obrigatorio, ordem });
  return res.status(201).json(field);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { fieldId } = req.params;

  const field = await ShowService({ id: fieldId, companyId });
  return res.json(field);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { fieldId } = req.params;
  const { nome, chave, tipo, opcoes, obrigatorio, ordem } = req.body;

  const field = await UpdateService({
    id: fieldId,
    companyId,
    nome,
    chave,
    tipo,
    opcoes,
    obrigatorio,
    ordem
  });

  return res.json(field);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { fieldId } = req.params;

  await DeleteService({ id: fieldId, companyId });
  return res.json({ message: "Campo removido" });
};
