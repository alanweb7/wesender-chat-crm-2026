import AppError from "../../errors/AppError";
import KnowledgeBase from "../../models/KnowledgeBase";
import KnowledgeBaseItem from "../../models/KnowledgeBaseItem";

const DeleteItemService = async (itemId: number, companyId: number): Promise<void> => {
  const item = await KnowledgeBaseItem.findByPk(itemId, {
    include: [{ model: KnowledgeBase, as: "knowledgeBase" }]
  });
  if (!item || item.knowledgeBase?.companyId !== companyId) {
    throw new AppError("Item não encontrado", 404);
  }
  await item.destroy();
};

export default DeleteItemService;
