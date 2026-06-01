import Whatsapp from "../models/Whatsapp";
import Ticket from "../models/Ticket";
import GetWhatsappWbot from "./GetWhatsappWbot";
import fs from "fs";
import formatBody from "./Mustache";

import { getMessageOptions } from "../services/WbotServices/SendWhatsAppMedia";

export type MessageData = {
  number: number | string;
  body: string;
  mediaPath?: string;
  companyId?: number;
  mediaName?: string;
};

export const SendMessage = async (
  whatsapp: Whatsapp,
  messageData: MessageData,
  isGroup: boolean = false,
  ticket?: Ticket

): Promise<any> => {
  try {
    const wbot = await GetWhatsappWbot(whatsapp);
    const chatId = `${messageData.number}@${!!isGroup ? 'g.us' : 's.whatsapp.net'}`;
    const companyId = messageData?.companyId ? messageData.companyId.toString(): null;

    let message;

    // Aplicar formatBody para substituir variáveis
    const formattedBody = formatBody(messageData.body, ticket);

    if (messageData.mediaPath) {
      const options = await getMessageOptions(
        messageData.mediaName,
        messageData.mediaPath,
        companyId,
        formattedBody,
      );
      if (options) {
        const body = fs.readFileSync(messageData.mediaPath);
        message = await wbot.sendMessage(chatId, {
          ...options
        });
      }
    } else {
      message = await wbot.sendMessage(chatId, { text: formattedBody });
    }

    return message;
  } catch (err: any) {
    throw new Error(err);
  }
};
