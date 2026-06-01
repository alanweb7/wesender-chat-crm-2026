import Produto from "../../models/Produto";
import ProdutoCategoria from "../../models/ProdutoCategoria";
import ProdutoVariacaoItem from "../../models/ProdutoVariacaoItem";
import ProdutoVariacaoOpcao from "../../models/ProdutoVariacaoOpcao";
import ProdutoVariacaoGrupo from "../../models/ProdutoVariacaoGrupo";
import ProdutoMarca from "../../models/ProdutoMarca";
import ProdutoCustomFieldValue from "../../models/ProdutoCustomFieldValue";
import ProdutoCustomFieldDefinition from "../../models/ProdutoCustomFieldDefinition";
import AppError from "../../errors/AppError";
import { VariacaoInput, prepareVariacoes } from "./helpers/variacoes";
import { syncVariacoes } from "./helpers/syncVariacoes";

interface ProdutoData {
  tipo?: string;
  nome?: string;
  descricao?: string;
  valor?: number;
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

const ALLOWED_TYPES = ["fisico", "digital", "imovel", "servico", "veiculo"] as const;

const sanitizeStockValue = (value?: number | string | null): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

const UpdateService = async (
  id: string | number,
  companyId: number,
  data: ProdutoData
): Promise<Produto> => {
  const produto = await Produto.findOne({
    where: {
      id,
      companyId
    }
  });

  if (!produto) {
    throw new AppError("ERR_PRODUTO_NOT_FOUND", 404);
  }

  let categoriaId: number | null | undefined = data.categoriaId;

  if (data.hasOwnProperty("categoriaId")) {
    if (categoriaId) {
      const categoria = await ProdutoCategoria.findOne({
        where: {
          id: categoriaId,
          companyId
        }
      });

      if (!categoria) {
        throw new AppError("ERR_PRODUTO_CATEGORIA_NOT_FOUND", 404);
      }
    } else {
      categoriaId = null;
    }
  } else {
    categoriaId = produto.categoriaId;
  }

  const nextTipo = data.tipo ?? produto.tipo;

  if (!ALLOWED_TYPES.includes(nextTipo as (typeof ALLOWED_TYPES)[number])) {
    throw new AppError("ERR_PRODUTO_INVALID_TYPE", 400);
  }

  let controleEstoque = produto.controleEstoque;
  let estoqueAtual = produto.estoqueAtual ?? 0;
  let estoqueMinimo = produto.estoqueMinimo ?? 0;

  if (nextTipo === "fisico") {
    if (data.hasOwnProperty("controleEstoque")) {
      controleEstoque = Boolean(data.controleEstoque);
    }

    if (controleEstoque) {
      if (data.hasOwnProperty("estoqueAtual")) {
        estoqueAtual = sanitizeStockValue(data.estoqueAtual);
      }

      if (data.hasOwnProperty("estoqueMinimo")) {
        estoqueMinimo = sanitizeStockValue(data.estoqueMinimo);
      }
    } else {
      estoqueAtual = 0;
      estoqueMinimo = 0;
    }
  } else {
    controleEstoque = false;
    estoqueAtual = 0;
    estoqueMinimo = 0;
  }

  const preparedVariacoes = await prepareVariacoes(companyId, data.variacoes);

  await produto.update({
    ...data,
    tipo: nextTipo,
    categoriaId,
    controleEstoque,
    estoqueAtual,
    estoqueMinimo
  });

  await syncVariacoes(produto.id, preparedVariacoes);

  // Sincronizar campos personalizados
  console.log("UpdateService - data.customFields:", data.customFields);
  console.log("UpdateService - hasOwnProperty customFields:", data.hasOwnProperty("customFields"));
  
  if (data.hasOwnProperty("customFields") && Array.isArray(data.customFields)) {
    console.log("UpdateService - Entrou na condição de customFields");
    // Deletar todos os campos personalizados existentes
    await ProdutoCustomFieldValue.destroy({
      where: { produtoId: produto.id }
    });

    // Criar novos campos personalizados
    if (data.customFields.length > 0) {
      const customFieldValues = data.customFields.map(cf => ({
        produtoId: produto.id,
        fieldDefinitionId: cf.fieldDefinitionId,
        valorTexto: cf.valorTexto
      }));
      console.log("UpdateService - Criando customFieldValues:", customFieldValues);
      await ProdutoCustomFieldValue.bulkCreate(customFieldValues);
    }
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

export default UpdateService;
