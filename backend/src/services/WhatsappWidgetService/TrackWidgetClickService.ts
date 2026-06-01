import WhatsappWidget from "../../models/WhatsappWidget";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

interface Request {
  code: string;
  ip?: string;
  userAgent?: string;
  referrer?: string;
}

interface WidgetInfo {
  phone: string;
  welcomeMessage: string | null;
  buttonColor: string;
  buttonPosition: string;
}

const TrackWidgetClickService = async ({
  code,
  ip,
  userAgent,
  referrer
}: Request): Promise<WidgetInfo> => {
  const widget = await WhatsappWidget.findOne({
    where: { code, active: true },
    include: [{ model: Whatsapp, as: "whatsapp", attributes: ["id", "number"] }]
  });

  if (!widget) {
    throw new AppError("ERR_WIDGET_NOT_FOUND", 404);
  }

  await widget.increment("totalClicks");

  const whatsapp = (widget as any).whatsapp;

  return {
    phone: whatsapp?.number || "",
    welcomeMessage: widget.welcomeMessage,
    buttonColor: widget.buttonColor,
    buttonPosition: widget.buttonPosition
  };
};

export default TrackWidgetClickService;
