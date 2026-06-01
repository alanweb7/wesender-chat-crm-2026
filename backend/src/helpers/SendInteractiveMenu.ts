import { generateWAMessageFromContent, WAMessage } from "@whiskeysockets/baileys";
import Ticket from "../models/Ticket";
import GetTicketWbot from "./GetTicketWbot";
import { delay } from "bluebird";
import { typeSimulation } from "../services/WbotServices/SendWhatsAppMediaFlow";
import logger from "../utils/logger";
import CreateMessageService from "../services/MessageServices/CreateMessageService";

interface InteractiveMenuData {
  ticket: Ticket;
  menuMessage: string;
  arrayOption: Array<{
    number: string;
    value: string;
    next?: string;
  }>;
  menuType?: "buttons" | "text";
}

export const SendInteractiveMenu = async ({
  ticket,
  menuMessage,
  arrayOption
}: InteractiveMenuData): Promise<void> => {
  try {
    const wbot = await GetTicketWbot(ticket);
    const jid = `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;

    if (arrayOption.length > 3) {
      logger.warn(`⚠️ Menu com ${arrayOption.length} opções excede o limite de 3, usando fallback textual`);
      throw new Error("Too many options for interactive menu");
    }

    const buttons = arrayOption.map((option) => ({
      name: "quick_reply" as const,
      buttonParamsJson: JSON.stringify({
        display_text: option.value.trim(),
        id: option.number.toString()
      })
    }));

    const interactiveMsg = {
      interactiveMessage: {
        body: {
          text: menuMessage.trim()
        },
        nativeFlowMessage: {
          buttons: buttons,
          messageParamsJson: JSON.stringify({
            from: "apiv2",
            templateId: "4194019344155670"
          })
        }
      }
    };

    await typeSimulation(ticket, "composing");
    await delay(2000);
    await typeSimulation(ticket, "paused");

    const newMsg = generateWAMessageFromContent(jid, interactiveMsg, {
      userJid: wbot.user.id
    }) as WAMessage;

    const additionalNodes = [
      {
        tag: "biz",
        attrs: {},
        content: [
          {
            tag: "interactive",
            attrs: { type: "native_flow", v: "1" },
            content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }]
          }
        ]
      }
    ];

    await wbot.relayMessage(jid, newMsg.message!, {
      messageId: newMsg.key.id,
      additionalNodes
    });

    if (newMsg) {
      await wbot.upsertMessage(newMsg, "notify");
    }

    // Salva no banco para aparecer no chat interno
    try {
      const buttonsData = arrayOption.map(option => ({
        name: "quick_reply",
        displayText: option.value.trim(),
        id: option.number.toString(),
        url: "",
        copyCode: "",
        phoneNumber: ""
      }));
      await CreateMessageService({
        messageData: {
          wid: newMsg.key.id,
          ticketId: ticket.id,
          contactId: undefined,
          body: menuMessage.trim() || "📋",
          fromMe: true,
          read: true,
          mediaType: "interactiveMessage",
          ack: 2,
          fromAgent: false,
          buttonsData,
        },
        companyId: ticket.companyId,
      });
    } catch (err) {
      logger.warn(`[SendInteractiveMenu] Falha ao salvar mensagem no banco: ${err}`);
    }

    logger.info(`📱 Menu interativo enviado para ticket ${ticket.id} com ${buttons.length} botões`);

  } catch (error) {
    logger.error(`❌ Erro ao enviar menu interativo para ticket ${ticket.id}:`, error);
    throw error;
  }
};

export const SendMenuAsText = async ({
  ticket,
  menuMessage,
  arrayOption
}: InteractiveMenuData): Promise<void> => {
  try {
    let optionsMenu = "";
    arrayOption.forEach(item => {
      optionsMenu += `[${item.number}] ${item.value}\n`;
    });

    const menuText = `${menuMessage}\n\n${optionsMenu}`;

    const SendWhatsAppMessage = (await import("../services/WbotServices/SendWhatsAppMessage")).default;
    const ShowTicketService = (await import("../services/TicketServices/ShowTicketService")).default;

    const ticketDetails = await ShowTicketService(ticket.id, ticket.companyId);

    await typeSimulation(ticket, "composing");
    await delay(2000);
    await typeSimulation(ticket, "paused");

    await SendWhatsAppMessage({
      body: menuText,
      ticket: ticketDetails,
      quotedMsg: null
    });

    logger.info(`📝 Menu textual enviado para ticket ${ticket.id}`);

  } catch (error) {
    logger.error(`❌ Erro ao enviar menu textual para ticket ${ticket.id}:`, error);
    throw error;
  }
};

interface CTAButton {
  type: "cta_url" | "cta_copy";
  displayText: string;
  value: string;
}

interface CTAButtonsData {
  ticket: Ticket;
  messageText: string;
  buttons: CTAButton[];
}

export const SendCTAButtons = async ({
  ticket,
  messageText,
  buttons
}: CTAButtonsData): Promise<void> => {
  if (buttons.length === 0 || buttons.length > 3) {
    throw new Error(`SendCTAButtons: esperado 1-3 botões, recebido ${buttons.length}`);
  }

  const wbot = await GetTicketWbot(ticket);
  const jid = `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;

  const nativeButtons = buttons.map(btn => {
    if (btn.type === "cta_url") {
      return {
        name: "cta_url" as const,
        buttonParamsJson: JSON.stringify({
          display_text: btn.displayText.trim(),
          url: btn.value.trim(),
          merchant_url: btn.value.trim()
        })
      };
    } else {
      return {
        name: "cta_copy" as const,
        buttonParamsJson: JSON.stringify({
          display_text: btn.displayText.trim(),
          copy_code: btn.value.trim()
        })
      };
    }
  });

  const interactiveMsg = {
    interactiveMessage: {
      body: {
        text: messageText.trim()
      },
      nativeFlowMessage: {
        buttons: nativeButtons,
        messageParamsJson: JSON.stringify({
          from: "apiv2",
          templateId: "4194019344155670"
        })
      }
    }
  };

  const newMsg = generateWAMessageFromContent(jid, interactiveMsg, {
    userJid: wbot.user.id
  }) as WAMessage;

  const additionalNodes = [
    {
      tag: "biz",
      attrs: {},
      content: [
        {
          tag: "interactive",
          attrs: { type: "native_flow", v: "1" },
          content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }]
        }
      ]
    }
  ];

  await wbot.relayMessage(jid, newMsg.message!, {
    messageId: newMsg.key.id,
    additionalNodes
  });

  if (newMsg) {
    await wbot.upsertMessage(newMsg, "notify");
  }

  // Salva no banco para aparecer no chat interno
  try {
    const buttonsData = buttons.map(btn => ({
      name: btn.type,
      displayText: btn.displayText,
      url: btn.type === "cta_url" ? btn.value : "",
      copyCode: btn.type === "cta_copy" ? btn.value : "",
      id: "",
      phoneNumber: ""
    }));
    await CreateMessageService({
      messageData: {
        wid: newMsg.key.id,
        ticketId: ticket.id,
        contactId: undefined,
        body: messageText.trim() || "📲",
        fromMe: true,
        read: true,
        mediaType: "interactiveMessage",
        ack: 2,
        fromAgent: false,
        buttonsData,
      },
      companyId: ticket.companyId,
    });
  } catch (err) {
    logger.warn(`[SendCTAButtons] Falha ao salvar mensagem no banco: ${err}`);
  }

  logger.info(`🔗 Botões CTA enviados para ticket ${ticket.id} (${buttons.length} botão/botões)`);
};

export const SendMenuWithFallback = async (data: InteractiveMenuData): Promise<void> => {
  const menuType = data.menuType || "buttons";

  if (menuType === "text") {
    await SendMenuAsText(data);
    return;
  }

  // menuType === "buttons": tenta quick_reply (≤3), cai em texto se falhar ou exceder
  if (data.arrayOption.length <= 3) {
    try {
      await SendInteractiveMenu(data);
      return;
    } catch (error) {
      logger.warn(`⚠️ Quick reply falhou para ticket ${data.ticket.id}, usando fallback textual:`, error);
    }
  } else {
    logger.warn(`⚠️ Menu com ${data.arrayOption.length} opções excede limite de 3, usando fallback textual`);
  }

  await SendMenuAsText(data);
};
