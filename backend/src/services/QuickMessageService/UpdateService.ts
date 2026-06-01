import AppError from "../../errors/AppError";
import QuickMessage from "../../models/QuickMessage";

interface CTAButton {
  type: "cta_url" | "cta_copy";
  displayText: string;
  value: string;
}

interface Data {
  shortcode: string;
  message: string;
  userId: number | string;
  id?: number | string;
  geral: boolean;
  mediaPath?: string | null;
  visao: boolean;
  messageType?: string;
  buttons?: CTAButton[] | null;
}

const UpdateService = async (data: Data): Promise<QuickMessage> => {
  const { id, shortcode, message, userId, geral, mediaPath, visao, messageType, buttons } = data;

  const record = await QuickMessage.findByPk(id);

  if (!record) {
    throw new AppError("ERR_NO_TICKETNOTE_FOUND", 404);
  }

  if (!record.geral && record.visao && record.userId !== userId) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await record.update({
    shortcode,
    message,
    // userId,
    geral,
    mediaPath,
    visao,
    messageType: messageType || "text",
    buttons: messageType === "buttons" ? (buttons || null) : null
  });

  return record;
};

export default UpdateService;
