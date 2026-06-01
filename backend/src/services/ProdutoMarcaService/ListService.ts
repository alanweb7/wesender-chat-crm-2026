import ProdutoMarca from "../../models/ProdutoMarca";

interface ListData {
  companyId: number;
}

const ListService = async ({ companyId }: ListData): Promise<ProdutoMarca[]> => {
  const marcas = await ProdutoMarca.findAll({
    where: {
      companyId
    },
    order: [["nome", "ASC"]]
  });

  return marcas;
};

export default ListService;
