import KnowledgeBase from "../../models/KnowledgeBase";
import KnowledgeBaseItem from "../../models/KnowledgeBaseItem";

const ListKnowledgeBasesService = async (companyId: number): Promise<KnowledgeBase[]> => {
  return KnowledgeBase.findAll({
    where: { companyId },
    include: [{ model: KnowledgeBaseItem, as: "items" }],
    order: [["name", "ASC"]]
  });
};

export default ListKnowledgeBasesService;
