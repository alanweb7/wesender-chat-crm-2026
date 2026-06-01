import AppError from "../../errors/AppError";
import ProdutoMarca from "../../models/ProdutoMarca";

interface DeleteData {
  id: string;
  companyId: number;
}

const DeleteService = async ({ id, companyId }: DeleteData): Promise<void> => {
  const marca = await ProdutoMarca.findOne({
    where: {
      id,
      companyId
    }
  });

  if (!marca) {
    throw new AppError("ERR_PRODUTO_MARCA_NOT_FOUND", 404);
  }

  await marca.destroy();
};

export default DeleteService;
