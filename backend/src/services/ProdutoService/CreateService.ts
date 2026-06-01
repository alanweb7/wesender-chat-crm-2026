import Produto from "../../models/Produto";
import ProdutoCategoria from "../../models/ProdutoCategoria";
import ProdutoVariacaoItem from "../../models/ProdutoVariacaoItem";
import ProdutoVariacaoOpcao from "../../models/ProdutoVariacaoOpcao";
import ProdutoVariacaoGrupo from "../../models/ProdutoVariacaoGrupo";
import ProdutoMarca from "../../models/ProdutoMarca";
import ProdutoCustomFieldValue from "../../models/ProdutoCustomFieldValue";
import ProdutoCustomFieldDefinition from "../../models/ProdutoCustomFieldDefinition";
import AppError from "../../errors/AppError";
import { prepareVariacoes, VariacaoInput } from "./helpers/variacoes";
import { syncVariacoes } from "./helpers/syncVariacoes";

interface ProdutoData {
  companyId: number;
  tipo: string;
  nome: string;
  descricao?: string;
  valor: number;
  status?: string;
  imagem_principal?: string;
  galeria?: any;
  dados_especificos?: any;
  linkCompra?: string;
  categoriaId?: number | null;
  marcaId?: number | null;
  customFields?: Array<{ fieldDefinitionId: number; valorTexto: string }>;
  controleEstoque?: boolean;
  estoqueAtual?: number;
  estoqueMinimo?: number;
  variacoes?: VariacaoInput[];
}

const ALLOWED_TYPES = ["fisico", "digital"] as const;

const CreateService = async (data: ProdutoData): Promise<Produto> => {
  let categoriaId: number | null | undefined = data.categoriaId;

  const tipo = data.tipo;

  if (!ALLOWED_TYPES.includes(tipo as (typeof ALLOWED_TYPES)[number])) {
    throw new AppError("ERR_PRODUTO_INVALID_TYPE", 400);
  }

  let controleEstoque = false;
  let estoqueAtual = 0;
  let estoqueMinimo = 0;

  if (tipo === "fisico") {
    controleEstoque = Boolean(data.controleEstoque);

    if (controleEstoque) {
      estoqueAtual = Number.isFinite(Number(data.estoqueAtual)) ? Number(data.estoqueAtual) : 0;
      estoqueMinimo = Number.isFinite(Number(data.estoqueMinimo)) ? Number(data.estoqueMinimo) : 0;

      if (estoqueAtual < 0 || estoqueMinimo < 0) {
        throw new AppError("ERR_PRODUTO_INVALID_STOCK", 400);
      }
    }
  }

  if (categoriaId) {
    const categoria = await ProdutoCategoria.findOne({
      where: {
        id: categoriaId,
        companyId: data.companyId
      }
    });

    if (!categoria) {
      throw new AppError("ERR_PRODUTO_CATEGORIA_NOT_FOUND", 404);
    }
  } else {
    categoriaId = null;
  }

  const { variacoes, ...produtoPayload } = data;

  console.log("CreateService - variacoes recebidas:", variacoes);

  const preparedVariacoes = await prepareVariacoes(data.companyId, variacoes);

  console.log("CreateService - variacoes preparadas:", preparedVariacoes);

  const produto = await Produto.create({
    ...produtoPayload,
    categoriaId,
    status: data.status || "disponivel",
    controleEstoque,
    estoqueAtual,
    estoqueMinimo
  });

  await syncVariacoes(produto.id, preparedVariacoes);

  // Criar campos personalizados
  if (data.customFields && Array.isArray(data.customFields) && data.customFields.length > 0) {
    const customFieldValues = data.customFields.map(cf => ({
      produtoId: produto.id,
      fieldDefinitionId: cf.fieldDefinitionId,
      valorTexto: cf.valorTexto
    }));
    await ProdutoCustomFieldValue.bulkCreate(customFieldValues);
  }

  await produto.reload({
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
      }
    ]
  });

  return produto;
};

export default CreateService;
