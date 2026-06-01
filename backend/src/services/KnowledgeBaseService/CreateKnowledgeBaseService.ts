import KnowledgeBase from "../../models/KnowledgeBase";

interface Params {
  name: string;
  description?: string;
  companyId: number;
}

const CreateKnowledgeBaseService = async ({ name, description, companyId }: Params): Promise<KnowledgeBase> => {
  return KnowledgeBase.create({ name, description, companyId });
};

export default CreateKnowledgeBaseService;
