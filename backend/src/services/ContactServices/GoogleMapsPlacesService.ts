import axios from "axios";
import path from "path";
import fs from "fs";
import { Job } from "bull";
import { ScrapeJobData, ScrapeJobResult } from "../../queues/googleMapsScrapeQueue";
import CreateOrUpdateContactServiceForImport from "./CreateOrUpdateContactServiceForImport";
import logger from "../../utils/logger";

const BASE = "https://maps.googleapis.com/maps/api/place";

interface PlaceBasic {
  place_id: string;
  name: string;
  business_status?: string;
  formatted_address?: string;
  rating?: number;
  user_ratings_total?: number;
}

interface PlaceDetail extends PlaceBasic {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const textSearch = async (
  query: string,
  apiKey: string,
  language: string,
  maxResults: number
): Promise<PlaceBasic[]> => {
  const results: PlaceBasic[] = [];
  let pageToken: string | null = null;

  while (results.length < maxResults) {
    const params: Record<string, string> = { query, key: apiKey, language };
    if (pageToken) params.pagetoken = pageToken;

    const { data } = await axios.get(`${BASE}/textsearch/json`, { params });

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      throw new Error(
        `Google Places API erro: ${data.status}${data.error_message ? " — " + data.error_message : ""}`
      );
    }

    results.push(...(data.results || []));

    if (!data.next_page_token || results.length >= maxResults) break;
    pageToken = data.next_page_token;
    await sleep(2000); // próximo token leva ~2s para ficar ativo
  }

  return results.slice(0, maxResults);
};

const getPlaceDetail = async (
  placeId: string,
  apiKey: string,
  language: string
): Promise<PlaceDetail> => {
  const fields = [
    "name",
    "formatted_phone_number",
    "international_phone_number",
    "website",
    "business_status",
    "formatted_address",
    "rating",
    "user_ratings_total",
    "opening_hours",
    "types"
  ].join(",");

  const { data } = await axios.get(`${BASE}/details/json`, {
    params: { place_id: placeId, key: apiKey, language, fields }
  });

  if (data.status !== "OK") {
    throw new Error(`Place Details API erro: ${data.status}`);
  }

  return { place_id: placeId, name: "", ...data.result } as PlaceDetail;
};

interface WebsiteData {
  email: string;
  social: Record<string, string>;
}

const scrapeWebsite = async (
  websiteUrl: string,
  socialEnabled: Record<string, boolean>
): Promise<WebsiteData> => {
  try {
    const { data: html } = await axios.get(websiteUrl, {
      timeout: 8000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" },
      maxRedirects: 3,
      maxContentLength: 500_000
    });

    // Email — prioridade: mailto: links, depois padrão regex no HTML
    let email = "";
    const mailtoMatch = html.match(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i);
    if (mailtoMatch) {
      email = mailtoMatch[1];
    } else {
      const emailMatch = html.match(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/);
      if (emailMatch) {
        // Ignorar emails de bibliotecas/CDN
        const skip = ["@example", "@sentry", "@jquery", "@google", "@w3.org", ".min.js"];
        if (!skip.some(s => emailMatch[1].includes(s))) {
          email = emailMatch[1];
        }
      }
    }

    // Redes sociais
    const patterns: Record<string, RegExp> = {
      facebook: /https?:\/\/(?:www\.)?facebook\.com\/(?!sharer)[^\s"'<>?#]+/gi,
      instagram: /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>?#]+/gi,
      tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>?#]+/gi,
      twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>?#]+/gi,
      youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[^\s"'<>?#]+/gi
    };

    const social: Record<string, string> = {};
    for (const [platform, pattern] of Object.entries(patterns)) {
      const key = platform + "s";
      if (!socialEnabled[key]) continue;
      const matches = html.match(pattern);
      if (matches?.[0]) social[platform] = matches[0].replace(/['"]+$/, "");
    }

    return { email, social };
  } catch {
    return { email: "", social: {} };
  }
};

const buildCsv = (rows: Record<string, unknown>[]): string => {
  if (rows.length === 0) {
    return "nome,telefone,email,endereco,website,avaliacao,totalAvaliacoes,aberto,tipo,status\n";
  }
  // União de todas as chaves para garantir colunas consistentes
  const allKeys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const header = allKeys.join(",");
  const lines = rows.map(row =>
    allKeys
      .map(k => `"${String(row[k] ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...lines].join("\n");
};

const GoogleMapsPlacesService = async (
  job: Job<ScrapeJobData>
): Promise<ScrapeJobResult> => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY não configurada. Adicione a variável no .env e reinicie o servidor."
    );
  }

  const {
    keywords,
    maxResultsPerKeyword = 20,
    locationQuery = "",
    language = "pt-BR",
    scrapeContacts = true,
    scrapePlaceDetailPage = true,
    skipClosedPlaces = false,
    scrapeSocialMediaProfiles,
    companyId
  } = job.data;

  logger.info(
    `[GoogleMapsPlaces] Job ${job.id} iniciado — ${keywords.length} termo(s), empresa ${companyId}`
  );

  const socialEnabled: Record<string, boolean> =
    typeof scrapeSocialMediaProfiles === "object" && scrapeSocialMediaProfiles
      ? (scrapeSocialMediaProfiles as Record<string, boolean>)
      : {};

  const collectSocial = Object.values(socialEnabled).some(Boolean);

  const allRows: Record<string, unknown>[] = [];
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < keywords.length; i++) {
    const term = locationQuery ? `${keywords[i]} ${locationQuery}` : keywords[i];
    logger.info(`[GoogleMapsPlaces] [${i + 1}/${keywords.length}] Buscando: "${term}"`);

    let places: PlaceBasic[] = [];
    try {
      places = await textSearch(term, apiKey, language, maxResultsPerKeyword);
    } catch (err) {
      logger.error(
        `[GoogleMapsPlaces] Erro na busca "${term}": ${(err as Error).message}`
      );
      continue;
    }

    logger.info(`[GoogleMapsPlaces] "${term}" → ${places.length} resultado(s)`);

    for (const place of places) {
      if (
        skipClosedPlaces &&
        place.business_status &&
        (place.business_status === "CLOSED_PERMANENTLY" ||
          place.business_status === "CLOSED_TEMPORARILY")
      ) {
        continue;
      }

      // Sempre buscar detalhes para obter telefone, website, avaliação
      let detail: PlaceDetail = place;
      try {
        detail = await getPlaceDetail(place.place_id, apiKey, language);
      } catch (err) {
        logger.warn(
          `[GoogleMapsPlaces] Detalhe falhou ${place.place_id}: ${(err as Error).message}`
        );
      }

      // Scrape do site: email + redes sociais (quando há website)
      let email = "";
      const row: Record<string, unknown> = {};

      if (detail.website && (scrapeContacts || collectSocial)) {
        const webData = await scrapeWebsite(detail.website, socialEnabled);
        email = webData.email;
        if (collectSocial) {
          if (socialEnabled.facebooks && webData.social.facebook) row.facebook = webData.social.facebook;
          if (socialEnabled.instagrams && webData.social.instagram) row.instagram = webData.social.instagram;
          if (socialEnabled.tiktoks && webData.social.tiktok) row.tiktok = webData.social.tiktok;
          if (socialEnabled.twitters && webData.social.twitter) row.twitter = webData.social.twitter;
          if (socialEnabled.youtubes && webData.social.youtube) row.youtube = webData.social.youtube;
        }
      }

      // Campos principais — sempre presentes
      const openNow = (detail as any).opening_hours?.open_now;
      const tipos = Array.isArray((detail as any).types)
        ? (detail as any).types.slice(0, 3).join(", ")
        : "";

      Object.assign(row, {
        nome: detail.name || "",
        telefone: detail.formatted_phone_number || "",
        email,
        endereco: detail.formatted_address || "",
        website: detail.website || "",
        avaliacao: detail.rating ?? "",
        totalAvaliacoes: detail.user_ratings_total ?? "",
        aberto: openNow === true ? "Sim" : openNow === false ? "Não" : "",
        tipo: tipos,
        status: detail.business_status || ""
      });

      allRows.push(row);

      const phone = String(row.telefone || "").replace(/\D/g, "");
      if (phone.length >= 8) {
        try {
          await CreateOrUpdateContactServiceForImport({
            name: String(row.nome),
            number: phone,
            isGroup: false,
            companyId
          });
          imported++;
        } catch {
          skipped++;
        }
      } else {
        skipped++;
      }
    }

    await job.progress(Math.round(((i + 1) / keywords.length) * 100));
  }

  const uploadsDir = path.resolve(__dirname, "../../../public/uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const csvFileName = `scrape_${job.id}.csv`;
  fs.writeFileSync(
    path.join(uploadsDir, csvFileName),
    buildCsv(allRows),
    "utf8"
  );

  logger.info(
    `[GoogleMapsPlaces] Job ${job.id} concluído — ${imported} importados, ${skipped} ignorados`
  );

  return { imported, skipped, csvPath: `uploads/${csvFileName}` };
};

export default GoogleMapsPlacesService;
