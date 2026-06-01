import AppError from "../../errors/AppError";
import ProdutoCustomFieldDefinition from "../../models/ProdutoCustomFieldDefinition";

interface CreateData {
  companyId: number;
  nome: string;
  chave: string;
  tipo: string;
  opcoes?: any;
  obrigatorio?: boolean;
  ordem?: number;
}

const CreateService = async ({ companyId, nome, chave, tipo, opcoes, obrigatorio, ordem }: CreateData): Promise<ProdutoCustomFieldDefinition> => {
  const existing = await ProdutoCustomFieldDefinition.findOne({
    where: {
      companyId,
      chave
    }
  });

  if (existing) {
    throw new AppError("ERR_PRODUTO_CUSTOM_FIELD_DUPLICATED", 400);
  }

  const field = await ProdutoCustomFieldDefinition.create({
    companyId,
    nome,
    chave,
    tipo,
    opcoes: opcoes || null,
    obrigatorio: obrigatorio || false,
    ordem: ordem || 0
  });

  return field;
};

export default CreateService;
