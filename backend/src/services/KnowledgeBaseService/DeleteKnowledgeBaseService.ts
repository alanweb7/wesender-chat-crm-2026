import AppError from "../../errors/AppError";
import KnowledgeBase from "../../models/KnowledgeBase";

const DeleteKnowledgeBaseService = async (id: number, companyId: number): Promise<void> => {
  const kb = await KnowledgeBase.findOne({ where: { id, companyId } });
  if (!kb) throw new AppError("Base de conhecimento não encontrada", 404);
  await kb.destroy();
};

export default DeleteKnowledgeBaseService;
