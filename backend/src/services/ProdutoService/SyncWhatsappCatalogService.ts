// @ts-nocheck
import ProdutoWhatsappSync from "../../models/ProdutoWhatsappSync";
import Produto from "../../models/Produto";
import { getWbot } from "../../libs/wbot";
import logger from "../../utils/logger";

interface SyncParams {
  produtoId: number;
  companyId: number;
  whatsappIds: number[];
}

interface ProdutoCatalogData {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  url?: string;
  retailerId?: string;
  images?: string[];
}

const buildCatalogPayload = (produto: Produto): ProdutoCatalogData => {
  const payload: ProdutoCatalogData = {
    name: produto.nome,
    description: produto.descricao || "",
    price: produto.valor ? Math.round(Number(produto.valor) * 100) : undefined,
    currency: "BRL",
    url: produto.linkCompra || undefined,
    retailerId: String(produto.id)
  };

  if (produto.imagem_principal) {
    const baseUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
    // imagem_principal já contém o caminho relativo completo (ex: company1/produtos/arquivo.png)
    const imageUrl = `${baseUrl}/public/${produto.imagem_principal}`;
    payload.images = [{ url: imageUrl }] as any;
  }

  return payload;
};

const syncConnection = async (
  wbot: any,
  produto: Produto,
  syncRecord: ProdutoWhatsappSync,
  operation: "create" | "update" | "delete"
) => {
  const catalogPayload = buildCatalogPayload(produto);

  try {
    let whatsappProductId = syncRecord.whatsappProductId;

    if (operation === "delete") {
      if (!whatsappProductId) {
        await syncRecord.update({ syncStatus: "synced", syncError: null, lastSyncAt: new Date() });
        return;
      }
      await wbot.productDelete([whatsappProductId]);
    } else if (operation === "create" || !whatsappProductId) {
      const result = await wbot.productCreate(catalogPayload);
      whatsappProductId = result?.id || result?.productId || null;
    } else {
      await wbot.productUpdate(whatsappProductId, catalogPayload);
    }

    await syncRecord.update({
      whatsappProductId,
      syncStatus: "synced",
      syncError: null,
      lastSyncAt: new Date()
    });

    logger.info(`[CatalogSync] produto=${produto.id} whatsapp=${syncRecord.whatsappId} op=${operation} ok`);
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    logger.error(`[CatalogSync] erro produto=${produto.id} whatsapp=${syncRecord.whatsappId}: ${errorMsg}`);
    await syncRecord.update({
      syncStatus: "error",
      syncError: errorMsg,
      lastSyncAt: new Date()
    });
  }
};

export const syncProdutoToWhatsapp = async ({
  produtoId,
  companyId,
  whatsappIds
}: SyncParams): Promise<void> => {
  const produto = await Produto.findOne({ where: { id: produtoId, companyId } });
  if (!produto) return;

  // Buscar syncs atuais
  const existingSyncs = await ProdutoWhatsappSync.findAll({ where: { produtoId } });
  const existingMap = new Map(existingSyncs.map(s => [s.whatsappId, s]));

  // IDs novos e removidos
  const newIds = new Set(whatsappIds);
  const oldIds = new Set(existingMap.keys());

  // Remover conexões que foram desmarcadas
  for (const whatsappId of oldIds) {
    if (!newIds.has(whatsappId)) {
      const syncRecord = existingMap.get(whatsappId);
      try {
        const wbot = getWbot(whatsappId);
        await syncConnection(wbot, produto, syncRecord, "delete");
      } catch {
        // wbot pode não estar conectado — apenas remove o registro
      }
      await syncRecord.destroy();
    }
  }

  // Criar ou atualizar conexões marcadas
  for (const whatsappId of newIds) {
    let syncRecord = existingMap.get(whatsappId);
    if (!syncRecord) {
      syncRecord = await ProdutoWhatsappSync.create({
        produtoId,
        whatsappId,
        syncStatus: "pending"
      });
    }

    try {
      const wbot = getWbot(whatsappId);
      const operation = syncRecord.whatsappProductId ? "update" : "create";
      await syncConnection(wbot, produto, syncRecord, operation);
    } catch (err: any) {
      logger.warn(`[CatalogSync] wbot ${whatsappId} não disponível: ${err?.message}`);
      await syncRecord.update({ syncStatus: "error", syncError: "Conexão não disponível", lastSyncAt: new Date() });
    }
  }
};

export const deleteProdutoFromWhatsapp = async (produtoId: number): Promise<void> => {
  const syncs = await ProdutoWhatsappSync.findAll({ where: { produtoId } });

  for (const syncRecord of syncs) {
    if (!syncRecord.whatsappProductId) {
      await syncRecord.destroy();
      continue;
    }
    try {
      const wbot = getWbot(syncRecord.whatsappId);
      await wbot.productDelete([syncRecord.whatsappProductId]);
      logger.info(`[CatalogSync] delete produto=${produtoId} whatsapp=${syncRecord.whatsappId} ok`);
    } catch (err: any) {
      logger.warn(`[CatalogSync] delete falhou produto=${produtoId} whatsapp=${syncRecord.whatsappId}: ${err?.message}`);
    }
    await syncRecord.destroy();
  }
};
