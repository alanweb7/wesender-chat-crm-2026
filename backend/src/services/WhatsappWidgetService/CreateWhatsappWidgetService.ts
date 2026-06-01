import { randomBytes } from "crypto";
import WhatsappWidget from "../../models/WhatsappWidget";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

interface Request {
  companyId: number;
  whatsappId: number;
  name: string;
  welcomeMessage?: string;
  buttonColor?: string;
  buttonPosition?: "bottom-right" | "bottom-left";
}

const generateCode = (): string => randomBytes(4).toString("hex");

const CreateWhatsappWidgetService = async ({
  companyId,
  whatsappId,
  name,
  welcomeMessage,
  buttonColor = "#25D366",
  buttonPosition = "bottom-right"
}: Request): Promise<WhatsappWidget> => {
  const whatsapp = await Whatsapp.findOne({ where: { id: whatsappId, companyId } });
  if (!whatsapp) {
    throw new AppError("ERR_WHATSAPP_NOT_FOUND", 404);
  }

  let code = generateCode();
  let attempts = 0;
  while (attempts < 5) {
    const exists = await WhatsappWidget.findOne({ where: { code } });
    if (!exists) break;
    code = generateCode();
    attempts++;
  }

  const widget = await WhatsappWidget.create({
    companyId,
    whatsappId,
    code,
    name,
    welcomeMessage: welcomeMessage || null,
    buttonColor,
    buttonPosition,
    active: true,
    totalClicks: 0
  });

  return widget;
};

export default CreateWhatsappWidgetService;
