import WhatsappWidget from "../../models/WhatsappWidget";
import AppError from "../../errors/AppError";

interface Request {
  widgetId: number;
  companyId: number;
}

const DeleteWhatsappWidgetService = async ({
  widgetId,
  companyId
}: Request): Promise<void> => {
  const widget = await WhatsappWidget.findOne({ where: { id: widgetId, companyId } });
  if (!widget) {
    throw new AppError("ERR_WIDGET_NOT_FOUND", 404);
  }

  await widget.update({ active: false });
};

export default DeleteWhatsappWidgetService;
