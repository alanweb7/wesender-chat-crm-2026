import AppError from "../../errors/AppError";
import ProdutoMarca from "../../models/ProdutoMarca";

interface CreateData {
  companyId: number;
  nome: string;
  descricao?: string | null;
  logo?: string | null;
  active?: boolean;
}

const CreateService = async ({ companyId, nome, descricao, logo, active }: CreateData): Promise<ProdutoMarca> => {
  const existing = await ProdutoMarca.findOne({
    where: {
      companyId,
      nome
    }
  });

  if (existing) {
    throw new AppError("ERR_PRODUTO_MARCA_DUPLICATED", 400);
  }

  const marca = await ProdutoMarca.create({
    companyId,
    nome,
    descricao: descricao || null,
    logo: logo || null,
    active: active !== undefined ? active : true
  });

  return marca;
};

export default CreateService;
