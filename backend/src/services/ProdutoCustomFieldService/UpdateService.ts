import AppError from "../../errors/AppError";
import ProdutoCustomFieldDefinition from "../../models/ProdutoCustomFieldDefinition";

interface UpdateData {
  id: string;
  companyId: number;
  nome?: string;
  chave?: string;
  tipo?: string;
  opcoes?: any;
  obrigatorio?: boolean;
  ordem?: number;
}

const UpdateService = async ({ id, companyId, nome, chave, tipo, opcoes, obrigatorio, ordem }: UpdateData): Promise<ProdutoCustomFieldDefinition> => {
  const field = await ProdutoCustomFieldDefinition.findOne({
    where: {
      id,
      companyId
    }
  });

  if (!field) {
    throw new AppError("ERR_PRODUTO_CUSTOM_FIELD_NOT_FOUND", 404);
  }

  if (chave && chave !== field.chave) {
    const existing = await ProdutoCustomFieldDefinition.findOne({
      where: {
        companyId,
        chave
      }
    });

    if (existing) {
      throw new AppError("ERR_PRODUTO_CUSTOM_FIELD_DUPLICATED", 400);
    }
  }

  await field.update({
    nome: nome || field.nome,
    chave: chave || field.chave,
    tipo: tipo || field.tipo,
    opcoes: opcoes !== undefined ? opcoes : field.opcoes,
    obrigatorio: obrigatorio !== undefined ? obrigatorio : field.obrigatorio,
    ordem: ordem !== undefined ? ordem : field.ordem
  });

  return field;
};

export default UpdateService;
