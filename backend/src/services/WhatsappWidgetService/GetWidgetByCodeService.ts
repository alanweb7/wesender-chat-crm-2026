import WhatsappWidget from "../../models/WhatsappWidget";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

const GetWidgetByCodeService = async (code: string): Promise<WhatsappWidget & { whatsapp: Whatsapp }> => {
  const widget = await WhatsappWidget.findOne({
    where: { code, active: true },
    include: [{ model: Whatsapp, as: "whatsapp", attributes: ["id", "number", "name"] }]
  });

  if (!widget) {
    throw new AppError("ERR_WIDGET_NOT_FOUND", 404);
  }

  return widget as WhatsappWidget & { whatsapp: Whatsapp };
};

export default GetWidgetByCodeService;
