import AppError from "../../errors/AppError";
import KnowledgeBase from "../../models/KnowledgeBase";

interface Params {
  id: number;
  companyId: number;
  name?: string;
  description?: string;
}

const UpdateKnowledgeBaseService = async ({ id, companyId, name, description }: Params): Promise<KnowledgeBase> => {
  const kb = await KnowledgeBase.findOne({ where: { id, companyId } });
  if (!kb) throw new AppError("Base de conhecimento não encontrada", 404);
  await kb.update({ name, description });
  return kb;
};

export default UpdateKnowledgeBaseService;
