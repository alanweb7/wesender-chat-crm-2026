import AppError from "../../errors/AppError";
import ProdutoMarca from "../../models/ProdutoMarca";

interface UpdateData {
  id: string;
  companyId: number;
  nome?: string;
  descricao?: string | null;
  logo?: string | null;
  active?: boolean;
}

const UpdateService = async ({ id, companyId, nome, descricao, logo, active }: UpdateData): Promise<ProdutoMarca> => {
  const marca = await ProdutoMarca.findOne({
    where: {
      id,
      companyId
    }
  });

  if (!marca) {
    throw new AppError("ERR_PRODUTO_MARCA_NOT_FOUND", 404);
  }

  if (nome && nome !== marca.nome) {
    const existing = await ProdutoMarca.findOne({
      where: {
        companyId,
        nome
      }
    });

    if (existing) {
      throw new AppError("ERR_PRODUTO_MARCA_DUPLICATED", 400);
    }
  }

  await marca.update({
    nome: nome || marca.nome,
    descricao: descricao !== undefined ? descricao : marca.descricao,
    logo: logo !== undefined ? logo : marca.logo,
    active: active !== undefined ? active : marca.active
  });

  return marca;
};

export default UpdateService;
