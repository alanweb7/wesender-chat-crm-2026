import AppError from "../../errors/AppError";
import ProdutoCustomFieldDefinition from "../../models/ProdutoCustomFieldDefinition";

interface ShowData {
  id: string;
  companyId: number;
}

const ShowService = async ({ id, companyId }: ShowData): Promise<ProdutoCustomFieldDefinition> => {
  const field = await ProdutoCustomFieldDefinition.findOne({
    where: {
      id,
      companyId
    }
  });

  if (!field) {
    throw new AppError("ERR_PRODUTO_CUSTOM_FIELD_NOT_FOUND", 404);
  }

  return field;
};

export default ShowService;
