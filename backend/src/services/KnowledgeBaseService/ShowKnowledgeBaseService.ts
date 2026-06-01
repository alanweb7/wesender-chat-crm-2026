import AppError from "../../errors/AppError";
import KnowledgeBase from "../../models/KnowledgeBase";
import KnowledgeBaseItem from "../../models/KnowledgeBaseItem";

const ShowKnowledgeBaseService = async (id: number, companyId: number): Promise<KnowledgeBase> => {
  const kb = await KnowledgeBase.findOne({
    where: { id, companyId },
    include: [{ model: KnowledgeBaseItem, as: "items" }]
  });
  if (!kb) throw new AppError("Base de conhecimento não encontrada", 404);
  return kb;
};

export default ShowKnowledgeBaseService;
