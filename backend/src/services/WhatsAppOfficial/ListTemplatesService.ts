import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import { buildGraphClient } from "../WhatsappCoexistence/graphApiHelper";

export const ListTemplatesService = async (
  whatsappId: number,
  companyId: number
): Promise<any[]> => {
  const whatsapp = await Whatsapp.findOne({
    where: { id: whatsappId, companyId, channel: "whatsapp_official" }
  });

  if (!whatsapp) {
    throw new AppError("Conexão oficial não encontrada", 404);
  }

  const client = buildGraphClient(whatsapp.coexistencePermanentToken);
  const res = await client.get(
    `${whatsapp.coexistenceWabaId}/message_templates?fields=name,status,language,category,components&limit=100`
  );

  const templates: any[] = res.data?.data || [];
  return templates.filter((t: any) => t.status === "APPROVED");
};
