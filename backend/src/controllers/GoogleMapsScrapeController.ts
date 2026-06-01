import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import AppError from "../errors/AppError";
import {
  addScrapeJob,
  getGoogleMapsScrapeQueue,
  ScrapeJobResult
} from "../queues/googleMapsScrapeQueue";
import CreateService from "../services/ContactListService/CreateService";
import ContactListItem from "../models/ContactListItem";

export const startScrape = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const {
    keywords,
    locationQuery,
    language,
    maxResultsPerKeyword,
    maximumLeadsEnrichmentRecords,
    scrapeContacts,
    scrapeDirectories,
    scrapeImageAuthors,
    scrapeOrderOnline,
    scrapePlaceDetailPage,
    scrapeReviewsPersonalData,
    scrapeTableReservationProvider,
    scrapeSocialMediaProfiles,
    includeWebResults,
    skipClosedPlaces,
    verifyLeadsEnrichmentEmails
  } = req.body;
  const { companyId } = req.user;

  if (!Array.isArray(keywords) || keywords.length === 0) {
    throw new AppError("Informe ao menos uma palavra-chave", 400);
  }

  const max = Math.min(60, Math.max(1, Number(maxResultsPerKeyword) || 20));

  const job = await addScrapeJob({
    keywords: keywords.map((k: string) => k.trim()).filter(Boolean),
    locationQuery: locationQuery || "",
    language: language || "pt-BR",
    maxResultsPerKeyword: max,
    maximumLeadsEnrichmentRecords: Number(maximumLeadsEnrichmentRecords) || 0,
    scrapeContacts: Boolean(scrapeContacts),
    scrapeDirectories: Boolean(scrapeDirectories),
    scrapeImageAuthors: Boolean(scrapeImageAuthors),
    scrapeOrderOnline: Boolean(scrapeOrderOnline),
    scrapePlaceDetailPage: Boolean(scrapePlaceDetailPage),
    scrapeReviewsPersonalData: Boolean(scrapeReviewsPersonalData),
    scrapeTableReservationProvider: Boolean(scrapeTableReservationProvider),
    scrapeSocialMediaProfiles: scrapeSocialMediaProfiles || {},
    includeWebResults: Boolean(includeWebResults),
    skipClosedPlaces: Boolean(skipClosedPlaces),
    verifyLeadsEnrichmentEmails: Boolean(verifyLeadsEnrichmentEmails),
    companyId
  });

  return res.status(200).json({ jobId: job.id });
};

export const getScrapeStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { jobId } = req.params;
  const { companyId } = req.user;

  const queue = getGoogleMapsScrapeQueue();
  const job = await queue.getJob(jobId);

  if (!job) {
    throw new AppError("Job não encontrado", 404);
  }

  // garantir isolamento multi-tenant
  if (job.data.companyId !== companyId) {
    throw new AppError("Acesso não autorizado", 403);
  }

  const state = await job.getState();
  const progress = job._progress;
  const result: ScrapeJobResult | null =
    state === "completed" ? job.returnvalue : null;
  const failedReason = state === "failed" ? job.failedReason : null;

  return res.status(200).json({ status: state, progress, result, failedReason });
};

export const downloadScrapeCsv = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { jobId } = req.params;
  const { companyId } = req.user;

  const queue = getGoogleMapsScrapeQueue();
  const job = await queue.getJob(jobId);

  if (!job) throw new AppError("Job não encontrado", 404);
  if (job.data.companyId !== companyId) throw new AppError("Acesso não autorizado", 403);

  const state = await job.getState();
  if (state !== "completed") throw new AppError("Extração ainda não concluída", 400);

  const result: ScrapeJobResult = job.returnvalue;
  const filePath = path.resolve(
    __dirname,
    "../../public",
    result.csvPath
  );

  if (!fs.existsSync(filePath)) {
    throw new AppError("Arquivo CSV não encontrado", 404);
  }

  res.download(filePath, `contatos_google_maps_${jobId}.csv`);
};

export const createListFromScrape = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { jobId } = req.params;
  const { listName } = req.body;
  const { companyId } = req.user;

  if (!listName || !String(listName).trim()) {
    throw new AppError("Informe o nome da lista", 400);
  }

  const queue = getGoogleMapsScrapeQueue();
  const job = await queue.getJob(jobId);

  if (!job) throw new AppError("Job não encontrado", 404);
  if (job.data.companyId !== companyId) throw new AppError("Acesso não autorizado", 403);

  const state = await job.getState();
  if (state !== "completed") throw new AppError("Extração ainda não concluída", 400);

  const result: ScrapeJobResult = job.returnvalue;
  const filePath = path.resolve(__dirname, "../../public", result.csvPath);

  if (!fs.existsSync(filePath)) {
    throw new AppError("Arquivo de resultados não encontrado", 404);
  }

  // Ler CSV e extrair contatos
  const csvContent = fs.readFileSync(filePath, "utf8");
  const lines = csvContent.split("\n").filter(Boolean);
  if (lines.length < 2) throw new AppError("Nenhum contato encontrado na extração", 400);

  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  const nomeIdx = headers.indexOf("nome");
  const telefoneIdx = headers.indexOf("telefone");

  if (nomeIdx === -1 || telefoneIdx === -1) {
    throw new AppError("Formato do CSV inválido", 400);
  }

  const parseCsvRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === "," && !inQuotes) { result.push(current); current = ""; }
      else { current += char; }
    }
    result.push(current);
    return result;
  };

  // Criar a lista
  const contactList = await CreateService({
    name: String(listName).trim(),
    companyId
  });

  // Inserir contatos
  let inserted = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i]);
    const nome = (cols[nomeIdx] || "").replace(/"/g, "").trim();
    const telefone = (cols[telefoneIdx] || "").replace(/\D/g, "").trim();
    if (!nome || !telefone || telefone.length < 8) continue;

    await ContactListItem.findOrCreate({
      where: { number: telefone, contactListId: contactList.id, companyId },
      defaults: { name: nome, number: telefone, contactListId: contactList.id, companyId }
    });
    inserted++;
  }

  return res.status(200).json({ id: contactList.id, name: contactList.name, inserted });
};
