import WhatsappWidget from "../../models/WhatsappWidget";
import Whatsapp from "../../models/Whatsapp";

interface Request {
  companyId: number;
  whatsappId?: number;
}

const ListWhatsappWidgetsService = async ({
  companyId,
  whatsappId
}: Request): Promise<WhatsappWidget[]> => {
  const where: any = { companyId, active: true };
  if (whatsappId) where.whatsappId = whatsappId;

  const widgets = await WhatsappWidget.findAll({
    where,
    include: [{ model: Whatsapp, as: "whatsapp", attributes: ["id", "name", "number"] }],
    order: [["createdAt", "DESC"]]
  });

  return widgets;
};

export default ListWhatsappWidgetsService;
