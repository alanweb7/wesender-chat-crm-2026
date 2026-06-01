import ProdutoCustomFieldDefinition from "../../models/ProdutoCustomFieldDefinition";

interface ListData {
  companyId: number;
}

const ListService = async ({ companyId }: ListData): Promise<ProdutoCustomFieldDefinition[]> => {
  const fields = await ProdutoCustomFieldDefinition.findAll({
    where: {
      companyId
    },
    order: [["ordem", "ASC"], ["nome", "ASC"]]
  });

  return fields;
};

export default ListService;
