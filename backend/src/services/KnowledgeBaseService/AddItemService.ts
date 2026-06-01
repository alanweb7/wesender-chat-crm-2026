import AppError from "../../errors/AppError";
import KnowledgeBase from "../../models/KnowledgeBase";
import KnowledgeBaseItem from "../../models/KnowledgeBaseItem";

interface Params {
  knowledgeBaseId: number;
  companyId: number;
  type: string;
  title?: string;
  content?: string;
  url?: string;
  filePath?: string;
  mimeType?: string;
  fileSize?: number;
}

const AddItemService = async (params: Params): Promise<KnowledgeBaseItem> => {
  const kb = await KnowledgeBase.findOne({
    where: { id: params.knowledgeBaseId, companyId: params.companyId }
  });
  if (!kb) throw new AppError("Base de conhecimento não encontrada", 404);

  return KnowledgeBaseItem.create({
    knowledgeBaseId: params.knowledgeBaseId,
    type: params.type,
    title: params.title,
    content: params.content,
    url: params.url,
    filePath: params.filePath,
    mimeType: params.mimeType,
    fileSize: params.fileSize
  });
};

export default AddItemService;
