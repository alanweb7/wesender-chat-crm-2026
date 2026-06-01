import Bull, { Queue, Job } from "bull";
import logger from "../utils/logger";

export interface ScrapeJobData {
  // Termos de busca
  keywords: string[];
  // Localização
  locationQuery?: string;
  // Configurações
  language?: string;
  maxResultsPerKeyword?: number;
  maximumLeadsEnrichmentRecords?: number;
  // Dados a coletar
  scrapeContacts?: boolean;
  scrapeDirectories?: boolean;
  scrapeImageAuthors?: boolean;
  scrapeOrderOnline?: boolean;
  scrapePlaceDetailPage?: boolean;
  scrapeReviewsPersonalData?: boolean;
  scrapeTableReservationProvider?: boolean;
  scrapeSocialMediaProfiles?: {
    facebooks?: boolean;
    instagrams?: boolean;
    tiktoks?: boolean;
    twitters?: boolean;
    youtubes?: boolean;
  };
  // Filtros
  includeWebResults?: boolean;
  skipClosedPlaces?: boolean;
  verifyLeadsEnrichmentEmails?: boolean;
  // Multi-tenant
  companyId: number;
}

export interface ScrapeJobResult {
  imported: number;
  skipped: number;
  csvPath: string;
}

const REDIS_URI = process.env.REDIS_URI || "";

let scrapeQueueInstance: Queue<ScrapeJobData> | null = null;

export const getGoogleMapsScrapeQueue = (): Queue<ScrapeJobData> => {
  if (!scrapeQueueInstance) {
    scrapeQueueInstance = new Bull<ScrapeJobData>(
      "googleMapsScrape",
      REDIS_URI
    );
  }
  return scrapeQueueInstance;
};

export const addScrapeJob = async (data: ScrapeJobData) => {
  const queue = getGoogleMapsScrapeQueue();
  return queue.add(data, {
    attempts: 2,
    backoff: { type: "fixed", delay: 5000 },
    timeout: 300000,
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 86400 }
  });
};

export const processGoogleMapsScrapeQueue = (
  handler: (job: Job<ScrapeJobData>) => Promise<ScrapeJobResult>
) => {
  const queue = getGoogleMapsScrapeQueue();

  queue.process(1, async job => {
    try {
      return await handler(job);
    } catch (err) {
      logger.error(
        `[GoogleMapsScrape] Job ${job.id} falhou: ${(err as Error).message}`
      );
      throw err;
    }
  });

  queue.on("completed", job => {
    logger.info(`[GoogleMapsScrape] Job ${job.id} concluído`);
  });

  queue.on("failed", (job, err) => {
    logger.error(`[GoogleMapsScrape] Job ${job?.id} falhou`, err);
  });
};
