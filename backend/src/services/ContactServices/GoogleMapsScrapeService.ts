import { Job } from "bull";
import path from "path";
import fs from "fs";
import puppeteer, { Browser, Page } from "puppeteer-core";
import { ScrapeJobData, ScrapeJobResult } from "../../queues/googleMapsScrapeQueue";
import CreateOrUpdateContactServiceForImport from "./CreateOrUpdateContactServiceForImport";
import logger from "../../utils/logger";

interface ScrapedBusiness {
  name: string;
  phone: string;
  category: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const cleanPhone = (raw: string): string => raw.replace(/[^0-9]/g, "");
const isValidPhone = (phone: string): boolean =>
  phone.length >= 8 && phone.length <= 13;

const dismissConsent = async (page: Page): Promise<void> => {
  try {
    const consentBtn = await page.$(
      'button[aria-label*="Accept"], form[action*="consent"] button'
    );
    if (consentBtn) {
      logger.info("[GoogleMapsScrape] Dialog de consentimento encontrado — clicando");
      await consentBtn.click();
      await new Promise(r => setTimeout(r, 1200));
    } else {
      logger.info("[GoogleMapsScrape] Sem dialog de consentimento");
    }
  } catch (err) {
    logger.warn(`[GoogleMapsScrape] Erro ao fechar consent: ${(err as Error).message}`);
  }
};

const extractPlaceDetails = async (
  page: Page,
  url: string
): Promise<ScrapedBusiness | null> => {
  try {
    logger.info(`[GoogleMapsScrape]   → Abrindo estabelecimento: ${url.substring(0, 80)}...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    const afterUrl = page.url();
    logger.info(`[GoogleMapsScrape]   → URL após navegação: ${afterUrl.substring(0, 80)}`);

    await page.waitForSelector("h1", { timeout: 10000 });

    const name = await page
      .$eval("h1", el => el.textContent?.trim() || "")
      .catch(() => "");
    logger.info(`[GoogleMapsScrape]   → Nome: "${name}"`);

    const phoneAttr = await page
      .$eval(
        '[data-item-id^="phone:tel"]',
        el => el.getAttribute("data-item-id") || ""
      )
      .catch(() => "");
    const phone = cleanPhone(phoneAttr.replace("phone:tel:", ""));
    logger.info(`[GoogleMapsScrape]   → Telefone raw: "${phoneAttr}" → limpo: "${phone}"`);

    const category = await page
      .$eval(
        'button[jsaction*="pane.rating.category"], [jsaction*="category"]',
        el => el.textContent?.trim() || ""
      )
      .catch(() => "");
    logger.info(`[GoogleMapsScrape]   → Categoria: "${category}"`);

    return { name, phone, category };
  } catch (err) {
    logger.warn(
      `[GoogleMapsScrape]   → Falha ao extrair detalhes: ${(err as Error).message}`
    );
    return null;
  }
};

const collectPlaceLinks = async (
  page: Page,
  maxResults: number
): Promise<string[]> => {
  const links = new Set<string>();
  let stale = 0;
  let iteration = 0;

  while (links.size < maxResults && stale < 4) {
    iteration++;
    const found: string[] = await page.$$eval(
      'a[href*="/maps/place/"]',
      anchors => anchors.map(a => (a as HTMLAnchorElement).href)
    );
    const before = links.size;
    found.forEach(l => links.add(l.split("?")[0]));

    logger.info(
      `[GoogleMapsScrape]   scroll #${iteration} — ${found.length} âncoras no DOM, ${links.size} links únicos acumulados`
    );

    if (links.size === before) stale++;
    else stale = 0;

    await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (feed) feed.scrollTop = feed.scrollHeight;
    });
    await new Promise(r => setTimeout(r, 2000));
  }

  logger.info(`[GoogleMapsScrape]   Total de links coletados: ${links.size}`);
  return Array.from(links).slice(0, maxResults);
};

const scrapeKeyword = async (
  browser: Browser,
  keyword: string,
  maxResults: number
): Promise<ScrapedBusiness[]> => {
  const results: ScrapedBusiness[] = [];
  logger.info(`[GoogleMapsScrape] Abrindo nova aba para: "${keyword}"`);
  const page = await browser.newPage();

  try {
    await page.setUserAgent(USER_AGENT);

    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(
      keyword
    )}?hl=pt-BR`;

    logger.info(`[GoogleMapsScrape] Navegando para: ${searchUrl}`);

    try {
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    } catch (err) {
      logger.error(
        `[GoogleMapsScrape] FALHA no page.goto — ${(err as Error).message}`
      );
      logger.error(`[GoogleMapsScrape] URL tentada: ${searchUrl}`);
      return results;
    }

    const currentUrl = page.url();
    const title = await page.title();
    logger.info(`[GoogleMapsScrape] URL atual após goto: ${currentUrl}`);
    logger.info(`[GoogleMapsScrape] Título da página: "${title}"`);

    // snapshot do HTML inicial (primeiros 500 chars) para diagnóstico
    const bodySnippet = await page
      .evaluate(() => document.body?.innerHTML?.substring(0, 500) || "BODY VAZIO")
      .catch(() => "ERRO AO LER BODY");
    logger.info(`[GoogleMapsScrape] HTML inicial (500 chars): ${bodySnippet}`);

    await dismissConsent(page);

    logger.info(`[GoogleMapsScrape] Aguardando div[role="feed"]...`);
    const feedOk = await page
      .waitForSelector('div[role="feed"]', { timeout: 30000 })
      .then(() => true)
      .catch(() => false);

    if (!feedOk) {
      const urlAfter = page.url();
      const titleAfter = await page.title();
      const bodyAfter = await page
        .evaluate(() => document.body?.innerHTML?.substring(0, 800) || "")
        .catch(() => "");
      logger.error(`[GoogleMapsScrape] Feed NÃO encontrado para: "${keyword}"`);
      logger.error(`[GoogleMapsScrape] URL quando feed falhou: ${urlAfter}`);
      logger.error(`[GoogleMapsScrape] Título quando feed falhou: "${titleAfter}"`);
      logger.error(`[GoogleMapsScrape] HTML quando feed falhou: ${bodyAfter}`);
      return results;
    }

    logger.info(`[GoogleMapsScrape] Feed encontrado! Coletando links...`);
    const placeLinks = await collectPlaceLinks(page, maxResults);
    logger.info(`[GoogleMapsScrape] "${keyword}" — ${placeLinks.length} link(s) para visitar`);

    for (const link of placeLinks) {
      const data = await extractPlaceDetails(page, link);
      if (!data) continue;
      if (!data.phone || !isValidPhone(data.phone)) {
        logger.info(
          `[GoogleMapsScrape]   → Ignorado (sem telefone válido): "${data.name}" phone="${data.phone}"`
        );
        continue;
      }
      const duplicate = results.some(r => r.phone === data.phone);
      if (!duplicate) {
        results.push(data);
        logger.info(
          `[GoogleMapsScrape]   → Salvo: "${data.name}" | ${data.phone} | ${data.category}`
        );
      }
    }
  } catch (err) {
    logger.error(
      `[GoogleMapsScrape] Erro inesperado em scrapeKeyword: ${(err as Error).message}`
    );
    logger.error((err as Error).stack || "");
  } finally {
    logger.info(`[GoogleMapsScrape] Fechando aba de "${keyword}"`);
    await page.close();
  }

  return results;
};

const buildCsv = (businesses: ScrapedBusiness[]): string => {
  const header = "nome,telefone,segmento";
  const rows = businesses.map(b =>
    [
      `"${b.name.replace(/"/g, '""')}"`,
      b.phone,
      `"${b.category.replace(/"/g, '""')}"`
    ].join(",")
  );
  return [header, ...rows].join("\n");
};

const GoogleMapsScrapeService = async (
  job: Job<ScrapeJobData>
): Promise<ScrapeJobResult> => {
  const { keywords, maxResultsPerKeyword, companyId } = job.data;

  logger.info(
    `[GoogleMapsScrape] ===== Job ${job.id} iniciado =====`
  );
  logger.info(`[GoogleMapsScrape] Keywords: ${JSON.stringify(keywords)}`);
  logger.info(`[GoogleMapsScrape] Max por keyword: ${maxResultsPerKeyword}`);
  logger.info(`[GoogleMapsScrape] CompanyId: ${companyId}`);

  // Caminhos do Chrome/Chromium por plataforma
  const CHROME_PATHS = [
    // Linux (produção)
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
    // Windows (desenvolvimento)
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    // Variável de ambiente (override manual)
    process.env.PUPPETEER_EXECUTABLE_PATH || ""
  ].filter(Boolean);

  const chromeExe = CHROME_PATHS.find(p => {
    try { return require("fs").existsSync(p); } catch { return false; }
  });

  logger.info(`[GoogleMapsScrape] Lançando browser... (executável: ${chromeExe || "bundled Chromium"})`);
  let browser: Browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: { width: 1280, height: 800 },
      executablePath: chromeExe || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-dev-shm-usage"
      ]
    });
    logger.info("[GoogleMapsScrape] Browser lançado com sucesso");
  } catch (err) {
    logger.error(`[GoogleMapsScrape] FALHA ao lançar browser: ${(err as Error).message}`);
    throw err;
  }

  const allBusinesses: ScrapedBusiness[] = [];

  try {
    for (let i = 0; i < keywords.length; i++) {
      const keyword = keywords[i];
      await job.progress(Math.round((i / keywords.length) * 50));
      logger.info(`[GoogleMapsScrape] ----- Keyword ${i + 1}/${keywords.length}: "${keyword}" -----`);

      const found = await scrapeKeyword(browser, keyword, maxResultsPerKeyword);
      logger.info(
        `[GoogleMapsScrape] "${keyword}" → ${found.length} resultado(s) com telefone válido`
      );
      allBusinesses.push(...found);
    }
  } finally {
    logger.info("[GoogleMapsScrape] Fechando browser...");
    await browser.close();
    logger.info("[GoogleMapsScrape] Browser fechado");
  }

  const seen = new Set<string>();
  const unique = allBusinesses.filter(b => {
    if (seen.has(b.phone)) return false;
    seen.add(b.phone);
    return true;
  });

  logger.info(`[GoogleMapsScrape] Total após deduplicação: ${unique.length}`);

  const csvContent = buildCsv(unique);
  const uploadsDir = path.resolve(__dirname, "../../../public/uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const csvFileName = `scrape_${job.id}.csv`;
  const csvPath = path.join(uploadsDir, csvFileName);
  fs.writeFileSync(csvPath, csvContent, "utf8");
  logger.info(`[GoogleMapsScrape] CSV salvo: ${csvPath}`);

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < unique.length; i++) {
    await job.progress(50 + Math.round((i / Math.max(unique.length, 1)) * 50));
    try {
      await CreateOrUpdateContactServiceForImport({
        name: unique[i].name,
        number: unique[i].phone,
        isGroup: false,
        companyId
      });
      imported++;
    } catch (err) {
      logger.warn(`[GoogleMapsScrape] Falha ao importar "${unique[i].name}": ${(err as Error).message}`);
      skipped++;
    }
  }

  logger.info(
    `[GoogleMapsScrape] ===== Job ${job.id} concluído — ${imported} importados, ${skipped} ignorados =====`
  );

  return { imported, skipped, csvPath: `uploads/${csvFileName}` };
};

export default GoogleMapsScrapeService;
