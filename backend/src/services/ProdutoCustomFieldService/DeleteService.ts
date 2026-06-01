import AppError from "../../errors/AppError";
import ProdutoCustomFieldDefinition from "../../models/ProdutoCustomFieldDefinition";

interface DeleteData {
  id: string;
  companyId: number;
}

const DeleteService = async ({ id, companyId }: DeleteData): Promise<void> => {
  const field = await ProdutoCustomFieldDefinition.findOne({
    where: {
      id,
      companyId
    }
  });

  if (!field) {
    throw new AppError("ERR_PRODUTO_CUSTOM_FIELD_NOT_FOUND", 404);
  }

  await field.destroy();
};

export default DeleteService;
