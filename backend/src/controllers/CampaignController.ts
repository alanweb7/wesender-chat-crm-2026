import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { head } from "lodash";
import fs from "fs";
import path from "path";

import ListService from "../services/CampaignService/ListService";
import CreateService from "../services/CampaignService/CreateService";
import ShowService from "../services/CampaignService/ShowService";
import UpdateService from "../services/CampaignService/UpdateService";
import DeleteService from "../services/CampaignService/DeleteService";
import FindService from "../services/CampaignService/FindService";

import Campaign from "../models/Campaign";

import ContactTag from "../models/ContactTag";
import Contact from "../models/Contact";
import ContactList from "../models/ContactList";
import ContactListItem from "../models/ContactListItem";

import AppError from "../errors/AppError";
import { CancelService } from "../services/CampaignService/CancelService";
import { RestartService } from "../services/CampaignService/RestartService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  companyId: string | number;
};

type StoreData = {
  name: string;
  status: string;
  confirmation: boolean;
  scheduledAt: string;
  companyId: number;
  contactListId: number;
  tagListId: number | string;
  tagKanbanId: number | string;
  userId: number | string;
  queueId: number | string;
  statusTicket: string;
  openTicket: string;
  channel?: string;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: any;
  templateData?: any[];
  whatsappId?: number;
};

type FindParams = {
  companyId: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { records, count, hasMore } = await ListService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ records, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const data = req.body as StoreData;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const tagListIdNum = data.tagListId != null ? Number(data.tagListId) : NaN;
  const tagKanbanIdNum = data.tagKanbanId != null ? Number(data.tagKanbanId) : NaN;

  if (!isNaN(tagListIdNum) && tagListIdNum > 0) {

    const tagId = tagListIdNum;
    const campanhaNome = data.name;

    async function createContactListFromTag(tagId: number) {
      const formattedDate = new Date().toISOString();
      const contactTags = await ContactTag.findAll({ where: { tagId } });
      const contactIds = contactTags.map(ct => ct.contactId);

      const contacts = await Contact.findAll({ where: { id: contactIds, companyId } });
      const contactList = await ContactList.create({ name: `${campanhaNome} | TAG: ${tagId} - ${formattedDate}`, companyId });
      const { id: contactListId } = contactList;

      await ContactListItem.bulkCreate(contacts.map(contact => ({
        name: contact.name,
        number: contact.number,
        email: contact.email,
        contactListId,
        companyId,
        isWhatsappValid: true,
        isGroup: contact.isGroup
      })));

      return contactListId;
    }

    createContactListFromTag(tagId)
      .then(async (contactListId) => {
        const record = await CreateService({ ...data, companyId, contactListId });
        const io = getIO();
        io.of(String(companyId)).emit(`company-${companyId}-campaign`, { action: "create", record });
        return res.status(200).json(record);
      })
      .catch((error) => {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Error creating contact list' });
      });

  } else if (!isNaN(tagKanbanIdNum) && tagKanbanIdNum > 0) {
    const tagId = tagKanbanIdNum;
    const campanhaNome = data.name;

    async function createContactListFromTagKanban(tagId: number) {
      const formattedDate = new Date().toISOString();
      const contactTags = await ContactTag.findAll({ where: { tagId } });
      const contactIds = contactTags.map(ct => ct.contactId);

      const contacts = await Contact.findAll({ where: { id: contactIds, companyId } });
      const contactList = await ContactList.create({ name: `${campanhaNome} | TAGKANBAN: ${tagId} - ${formattedDate}`, companyId });
      const { id: contactListId } = contactList;

      await ContactListItem.bulkCreate(contacts.map(contact => ({
        name: contact.name,
        number: contact.number,
        email: contact.email,
        contactListId,
        companyId,
        isWhatsappValid: true,
        isGroup: contact.isGroup
      })));

      return contactListId;
    }

    createContactListFromTagKanban(tagId)
      .then(async (contactListId) => {
        const record = await CreateService({ ...data, companyId, contactListId });
        const io = getIO();
        io.of(String(companyId)).emit(`company-${companyId}-campaign`, { action: "create", record });
        return res.status(200).json(record);
      })
      .catch((error) => {
        console.error('Error:', error);
        return res.status(500).json({ error: 'Error creating contact list from kanban tag' });
      });

  } else { // SAI DO CHECK DE TAG


    const record = await CreateService({
      ...data,
      companyId
    });

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-campaign`, {
        action: "create",
        record
      });

    return res.status(200).json(record);
  }
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
    name: Yup.string().required()
  });

  try {
    await schema.validate(data);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;

  const record = await UpdateService({
    ...data,
    id
  });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-campaign`, {
      action: "update",
      record
    });

  return res.status(200).json(record);
};

export const cancel = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  await CancelService(+id);

  return res.status(204).json({ message: "Cancelamento realizado" });
};

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  await RestartService(+id);

  return res.status(204).json({ message: "Reinício dos disparos" });
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
    .emit(`company-${companyId}-campaign`, {
      action: "delete",
      id
    });

  return res.status(200).json({ message: "Campaign deleted" });
};

export const findList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const params = req.query as FindParams;
  const records: Campaign[] = await FindService(params);

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
    const campaign = await Campaign.findByPk(id);
    campaign.mediaPath = file.filename;
    campaign.mediaName = file.originalname;
    await campaign.save();
    return res.send({ mensagem: "Mensagem enviada" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const templateMediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  if (!file) {
    throw new AppError("Nenhum arquivo enviado");
  }

  return res.send({ mediaPath: file.filename, mediaName: file.originalname });
};

export const deleteTemplateMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { mediaPath } = req.body;

  if (mediaPath) {
    const filePath = path.resolve("public", `company${companyId}`, mediaPath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  return res.send({ mensagem: "Arquivo excluído" });
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  try {
    const campaign = await Campaign.findByPk(id);
    const filePath = path.resolve("public", `company${companyId}`, campaign.mediaPath);
    const fileExists = fs.existsSync(filePath);
    if (fileExists) {
      fs.unlinkSync(filePath);
    }

    campaign.mediaPath = null;
    campaign.mediaName = null;
    await campaign.save();
    return res.send({ mensagem: "Arquivo excluído" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};