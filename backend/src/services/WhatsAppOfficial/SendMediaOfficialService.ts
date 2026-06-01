import Whatsapp from "../../models/Whatsapp";
import Contact from "../../models/Contact";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { buildGraphClient, extractGraphError } from "../WhatsappCoexistence/graphApiHelper";
import fileType from "file-type";
import { rename } from "fs/promises";
import { createReadStream } from "fs";
import { join } from "path";
import FormData from "form-data";

const verifyExtensionFile = async (media: Express.Multer.File) => {
	const resultFile = await fileType.fromFile(media.path);
	const havePoint = media.filename.includes(".");
	const actualExtension = media.filename.split(".").pop();
	const extension = resultFile?.ext || havePoint ? actualExtension : "withoutExtension";

	let newFilename = media.filename;

	if (actualExtension && actualExtension !== extension && havePoint) {
		newFilename = media.filename.replace(actualExtension, extension);
		const newPath = join(media.destination, newFilename);
		await rename(media.path, newPath);
	} else if (!havePoint) {
		newFilename = `${media.filename}.${extension}`;
		const newPath = join(media.destination, newFilename);
		await rename(media.path, newPath);
	}

	media.filename = newFilename;
	media.originalname = newFilename;
};

// Mapeia mimetype para o tipo aceito pela Graph API
const resolveMediaType = (mimetype: string): string => {
  const [main] = mimetype.split("/");
  if (main === "image") return "image";
  if (main === "video") return "video";
  if (main === "audio") return "audio";
  return "document"; // application/pdf, etc.
};

interface SendMediaOfficialParams {
  media: Express.Multer.File;
  body: string;
  ticketId: number;
  contact: Contact;
  connection: Whatsapp;
  passVerification?: boolean;
}

export const SendMediaOfficialService = async ({
  media,
  body,
  ticketId,
  contact,
  connection,
  passVerification = false
}: SendMediaOfficialParams) => {
  if (!passVerification) await verifyExtensionFile(media);

  if (!connection.coexistencePhoneNumberId || !connection.coexistencePermanentToken) {
    throw new Error("ERR_OFFICIAL_MISSING_CREDENTIALS");
  }

  const client = buildGraphClient(connection.coexistencePermanentToken);

  // Upload da mídia via multipart/form-data
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", media.mimetype);
  form.append("file", createReadStream(media.path), {
    filename: media.filename,
    contentType: media.mimetype
  });

  let mediaId: string;
  try {
    const uploadRes = await client.post(
      `${connection.coexistencePhoneNumberId}/media`,
      form,
      { headers: form.getHeaders() }
    );
    mediaId = uploadRes.data.id;
    if (!mediaId) throw new Error("ERR_OFFICIAL_NO_MEDIA_ID");
  } catch (error) {
    const graphError = extractGraphError(error);
    console.error("[WhatsAppOfficial][SendMediaOfficial] upload error", { message: graphError });
    throw new Error(`ERR_OFFICIAL_MEDIA_UPLOAD: ${graphError}`);
  }

  const mediaType = resolveMediaType(media.mimetype);

  const messagePayload: any = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: contact.number,
    type: mediaType,
    [mediaType]: { id: mediaId }
  };

  if (body && (mediaType === "image" || mediaType === "video" || mediaType === "document")) {
    messagePayload[mediaType].caption = body;
  }

  if (mediaType === "document") {
    messagePayload[mediaType].filename = media.originalname || media.filename;
  }

  try {
    const response = await client.post(
      `${connection.coexistencePhoneNumberId}/messages`,
      messagePayload
    );

    const messageId = response.data?.messages?.[0]?.id;
    if (!messageId) throw new Error("ERR_OFFICIAL_NO_MESSAGE_ID");

    const newMessage = await CreateMessageService({
      messageData: {
        wid: messageId,
        ticketId,
        body,
        fromMe: true,
        read: true,
        mediaType,
        mediaUrl: media.filename
      },
      companyId: connection.companyId
    });

    return newMessage;
  } catch (error) {
    const graphError = extractGraphError(error);
    console.error("[WhatsAppOfficial][SendMediaOfficial] send error", { message: graphError });
    throw new Error(`ERR_OFFICIAL_SEND_MEDIA: ${graphError}`);
  }
};
