import path from "path";
import fs from "fs";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import Whatsapp from "../../models/Whatsapp";
import CreateMessageService from "../MessageServices/CreateMessageService";
import CreateOrUpdateTicketService from "../../HubEcosystem/services/CreateOrUpdateTicketService";
import FindOrCreateContactService from "../../HubEcosystem/services/FindOrCreateContactService";
import { buildGraphClient, extractGraphError } from "../WhatsappCoexistence/graphApiHelper";

interface OfficialWebhookMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: "messages";
      value: {
        messaging_product: "whatsapp";
        metadata: {
          phone_number_id: string;
          display_phone_number: string;
        };
        messages: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: "text" | "image" | "video" | "audio" | "document";
          text?: { body: string };
          image?: { id: string; caption?: string; mime_type?: string };
          video?: { id: string; caption?: string; mime_type?: string };
          audio?: { id: string; mime_type?: string };
          document?: { id: string; caption?: string; filename?: string; mime_type?: string };
        }>;
      };
    }>;
  }>;
}

// Busca a URL real do arquivo na Graph API e faz o download para disco
const downloadOfficialMedia = async (
  mediaId: string,
  token: string,
  mimeType?: string
): Promise<string | null> => {
  try {
    const client = buildGraphClient(token);

    // Passo 1: obter URL de download
    const metaRes = await client.get<{ url: string; mime_type: string }>(mediaId);
    const { url, mime_type } = metaRes.data;
    const resolvedMime = mimeType || mime_type || "application/octet-stream";

    // Determinar extensão a partir do mime type
    const ext = resolvedMime.split("/")[1]?.split(";")[0] || "bin";
    const filename = `${uuidv4()}.${ext}`;
    const destDir = path.resolve("public");
    const destPath = path.join(destDir, filename);

    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    // Passo 2: download do arquivo com o mesmo token
    const fileRes = await axios.get(url, {
      responseType: "stream",
      headers: { Authorization: `Bearer ${token}` }
    });

    await new Promise<void>((resolve, reject) => {
      const writer = fs.createWriteStream(destPath);
      fileRes.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    return filename;
  } catch (error) {
    console.error("[OfficialMessageListener] Erro ao baixar mídia:", extractGraphError(error));
    return null;
  }
};

export const OfficialMessageListener = async (body: OfficialWebhookMessage) => {
  if (!body.entry || !Array.isArray(body.entry)) return;

  for (const entryItem of body.entry) {
    const { changes } = entryItem;
    if (!changes || !Array.isArray(changes)) continue;

    for (const change of changes) {
      if (change.field !== "messages") continue;

      const { value } = change;
      if (!value.messages || !Array.isArray(value.messages)) continue;

      const connection = await Whatsapp.findOne({
        where: {
          coexistencePhoneNumberId: value.metadata.phone_number_id,
          channel: "whatsapp_official"
        }
      });

      if (!connection) {
        console.warn("[OfficialMessageListener] Conexão não encontrada para phone_number_id:", value.metadata.phone_number_id);
        continue;
      }

      for (const message of value.messages) {
        if (!message.from) continue;

        const from = message.from;
        const messageId = message.id;
        const timestamp = new Date(parseInt(message.timestamp) * 1000);

        let msgBody = "";
        let mediaUrl: string | null = null;
        let mediaType = "";
        let fileName = "";

        switch (message.type) {
          case "text":
            msgBody = message.text?.body || "";
            break;

          case "image":
            msgBody = message.image?.caption || "";
            mediaType = "image";
            mediaUrl = await downloadOfficialMedia(
              message.image!.id,
              connection.coexistencePermanentToken,
              message.image?.mime_type
            );
            break;

          case "video":
            msgBody = message.video?.caption || "";
            mediaType = "video";
            mediaUrl = await downloadOfficialMedia(
              message.video!.id,
              connection.coexistencePermanentToken,
              message.video?.mime_type
            );
            break;

          case "audio":
            mediaType = "audio";
            mediaUrl = await downloadOfficialMedia(
              message.audio!.id,
              connection.coexistencePermanentToken,
              message.audio?.mime_type
            );
            break;

          case "document":
            msgBody = message.document?.caption || "";
            mediaType = "document";
            fileName = message.document?.filename || "";
            mediaUrl = await downloadOfficialMedia(
              message.document!.id,
              connection.coexistencePermanentToken,
              message.document?.mime_type
            );
            break;
        }

        try {
          const contact = await FindOrCreateContactService({
            name: from,
            firstName: from,
            lastName: "",
            picture: "",
            from,
            connection
          });

          const ticket = await CreateOrUpdateTicketService({
            contactId: contact.id,
            channel: "whatsapp_official",
            contents: [{ type: message.type as any, text: msgBody }],
            connection
          });

          const messageData: any = {
            wid: messageId,
            contactId: contact.id,
            body: msgBody || `Mídia ${message.type}`,
            ticketId: ticket.id,
            fromMe: false,
            ack: 1,
            read: false
          };

          if (mediaUrl) {
            messageData.mediaUrl = mediaUrl;
            messageData.mediaType = mediaType;
          }

          await CreateMessageService({
            messageData,
            companyId: connection.companyId
          });
        } catch (error) {
          console.error("[OfficialMessageListener] Erro ao processar mensagem:", error);
        }
      }
    }
  }
};
