import AppError from "../../errors/AppError";
import ProdutoMarca from "../../models/ProdutoMarca";

interface ShowData {
  id: string;
  companyId: number;
}

const ShowService = async ({ id, companyId }: ShowData): Promise<ProdutoMarca> => {
  const marca = await ProdutoMarca.findOne({
    where: {
      id,
      companyId
    }
  });

  if (!marca) {
    throw new AppError("ERR_PRODUTO_MARCA_NOT_FOUND", 404);
  }

  return marca;
};

export default ShowService;
