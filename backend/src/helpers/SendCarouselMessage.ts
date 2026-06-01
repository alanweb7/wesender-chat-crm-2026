import { proto, generateWAMessageFromContent, WAMessage } from "@whiskeysockets/baileys";
import Ticket from "../models/Ticket";
import GetTicketWbot from "./GetTicketWbot";
import { delay } from "bluebird";
import { typeSimulation } from "../services/WbotServices/SendWhatsAppMediaFlow";
import logger from "../utils/logger";

interface CarouselCard {
  title: string;
  description?: string;
  price?: string;
  image?: string;
  button?: {
    text: string;
    value: string;
  };
}

interface CarouselData {
  ticket: Ticket;
  title: string;
  cards: CarouselCard[];
}

export const SendCarouselMessage = async ({
  ticket,
  title,
  cards
}: CarouselData): Promise<void> => {
  try {
    const wbot = await GetTicketWbot(ticket);
    const jid = `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;

    // Validar número de cards (mínimo 2, máximo 10 para carrossel)
    if (cards.length < 2) {
      logger.warn(`⚠️ Carrossel com ${cards.length} cards é menor que mínimo 2, usando fallback textual`);
      throw new Error("Too few cards for carousel (minimum 2)");
    }

    if (cards.length > 10) {
      logger.warn(`⚠️ Carrossel com ${cards.length} cards excede o limite de 10, usando fallback textual`);
      throw new Error("Too many cards for carousel (maximum 10)");
    }

    // Log detalhado dos cards
    logger.info(`🎠 Preparando ${cards.length} cards para carrossel`);
    cards.forEach((card, idx) => {
      logger.info(`  Card ${idx + 1}: title="${card.title}", image="${card.image.substring(0, 50)}...", button="${card.button?.text}"`);
    });

    // Converter cards para formato do WhatsApp carousel
    const carouselCards = cards.map((card, index) => {
      // Verificar se o botão é um link (URL) ou ID
      const isUrl = card.button?.value && (card.button.value.startsWith('http://') || card.button.value.startsWith('https://'));
      
      return {
        header: {
          hasMediaAttachment: true,
          imageMessage: {
            url: card.image,
            mimetype: "image/jpeg",
            caption: card.title,
          }
        },
        body: {
          text: card.description || ""
        },
        footer: card.price
          ? {
            text: card.price
          }
          : undefined,
        nativeFlowMessage: card.button
          ? {
              buttons: isUrl
                ? [
                    {
                      name: "cta_url",
                      buttonParamsJson: JSON.stringify({
                        display_text: card.button.text,
                        url: card.button.value,
                        merchant_url: card.button.value
                      })
                    }
                  ]
                : [
                    {
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({
                        display_text: card.button.text,
                        id: card.button.value
                      })
                    }
                  ]
            }
          : undefined
      };
    });

    // Montar mensagem de carrossel
    const carouselMsg = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: title.trim()
            },
            body: {
              text: title.trim()
            },
            carouselMessage: {
              cards: carouselCards
            }
          }
        }
      }
    };

    // Simular digitação
    await typeSimulation(ticket, "composing");
    await delay(2000);
    await typeSimulation(ticket, "paused");

    // Gerar e enviar mensagem
    const newMsg = generateWAMessageFromContent(jid, carouselMsg, {
      userJid: wbot.user.id
    }) as WAMessage;

    // Gerar decision_id aleatório para quality_control
    const decisionId = Math.random().toString(36).substring(2, 18);

    // additionalNodes para renderização consistente (regra OBRIGATÓRIA do manual)
    const additionalNodes = [
      {
        tag: "biz",
        attrs: {},
        content: [
          {
            tag: "interactive",
            attrs: { type: "native_flow", v: "1" },
            content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }]
          },
          {
            tag: "quality_control",
            attrs: { decision_id: decisionId },
            content: [{ tag: "decision_source", attrs: { value: "df" } }]
          }
        ]
      }
    ];

    logger.info(`🎠 Enviando carrossel para ${jid} com ${cards.length} cards`);
    
    await wbot.relayMessage(jid, newMsg.message!, {
      messageId: newMsg.key.id,
      additionalNodes
    });

    if (newMsg) {
      await wbot.upsertMessage(newMsg, "notify");
    }

    logger.info(`✅ Carrossel enviado para ticket ${ticket.id}`);
    logger.info(`📝 Título: ${title}`);
    logger.info(`🃏 Cards: ${cards.length}`);

  } catch (error) {
    logger.error(`❌ Erro ao enviar carrossel para ticket ${ticket.id}:`, error);
    throw error;
  }
};

// Helper para fallback textual do carrossel
export const SendCarouselAsText = async ({
  ticket,
  title,
  cards
}: CarouselData): Promise<void> => {
  try {
    let carouselText = `${title}\n\n`;

    cards.forEach((card, index) => {
      carouselText += `*${index + 1}. ${card.title}*\n`;
      if (card.description) {
        carouselText += `📝 ${card.description}\n`;
      }
      if (card.price) {
        carouselText += `💰 ${card.price}\n`;
      }
      carouselText += "\n";
    });

    const SendWhatsAppMessage = (await import("../services/WbotServices/SendWhatsAppMessage")).default;
    const ShowTicketService = (await import("../services/TicketServices/ShowTicketService")).default;

    const ticketDetails = await ShowTicketService(ticket.id, ticket.companyId);

    await typeSimulation(ticket, "composing");
    await delay(2000);
    await typeSimulation(ticket, "paused");

    await SendWhatsAppMessage({
      body: carouselText,
      ticket: ticketDetails,
      quotedMsg: null
    });

    logger.info(`📝 Carrossel textual enviado como fallback para ticket ${ticket.id}`);

  } catch (error) {
    logger.error(`❌ Erro ao enviar carrossel textual para ticket ${ticket.id}:`, error);
    throw error;
  }
};

// Helper principal com fallback inteligente
export const SendCarouselWithFallback = async (data: CarouselData): Promise<void> => {
  try {
    // Tentar enviar carrossel nativo
    await SendCarouselMessage(data);
    logger.info(`✅ Carrossel nativo enviado para ticket ${data.ticket.id}`);
  } catch (error) {
    logger.warn(`⚠️ Carrossel nativo falhou, usando fallback textual para ticket ${data.ticket.id}:`, error);
    
    // Fallback para texto
    await SendCarouselAsText(data);
  }
};
