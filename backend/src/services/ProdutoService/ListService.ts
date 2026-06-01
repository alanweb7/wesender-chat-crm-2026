import Produto from "../../models/Produto";
import ProdutoCategoria from "../../models/ProdutoCategoria";
import ProdutoVariacaoItem from "../../models/ProdutoVariacaoItem";
import ProdutoVariacaoOpcao from "../../models/ProdutoVariacaoOpcao";
import ProdutoVariacaoGrupo from "../../models/ProdutoVariacaoGrupo";
import ProdutoMarca from "../../models/ProdutoMarca";
import ProdutoCustomFieldValue from "../../models/ProdutoCustomFieldValue";
import ProdutoCustomFieldDefinition from "../../models/ProdutoCustomFieldDefinition";
import ProdutoWhatsappSync from "../../models/ProdutoWhatsappSync";

interface ListParams {
  companyId: number;
  tipo?: string;
  categoriaId?: number;
}

const ListService = async ({ companyId, tipo, categoriaId }: ListParams): Promise<Produto[]> => {
  const whereCondition: any = {
    companyId
  };

  if (tipo) {
    whereCondition.tipo = tipo;
  }

  if (categoriaId) {
    whereCondition.categoriaId = categoriaId;
  }

  const produtos = await Produto.findAll({
    where: whereCondition,
    include: [
      {
        model: ProdutoCategoria,
        attributes: ["id", "nome"]
      },
      {
        model: ProdutoMarca,
        attributes: ["id", "nome", "logo", "active"]
      },
      {
        model: ProdutoCustomFieldValue,
        include: [
          {
            model: ProdutoCustomFieldDefinition,
            as: "fieldDefinition"
          }
        ]
      },
      {
        model: ProdutoVariacaoItem,
        include: [
          {
            model: ProdutoVariacaoOpcao,
            attributes: ["id", "nome", "ordem", "grupoId"],
            include: [
              {
                model: ProdutoVariacaoGrupo,
                attributes: ["id", "nome"]
              }
            ]
          }
        ]
      },
      {
        model: ProdutoWhatsappSync,
        attributes: ["id", "whatsappId", "whatsappProductId", "syncStatus", "lastSyncAt"]
      }
    ],
    order: [["nome", "ASC"]]
  });

  return produtos;
};

export default ListService;
