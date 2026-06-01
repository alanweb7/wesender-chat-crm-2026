import Servico from "../../models/Servico";
import AppError from "../../errors/AppError";

interface UpdateParams {
  id: string | number;
  companyId: number;
  nome?: string;
  descricao?: string;
  valorOriginal?: number;
  tempoAtendimento?: number | null;
  imagem?: string | null;
}

const UpdateServicoService = async ({
  id,
  companyId,
  nome,
  descricao,
  valorOriginal,
  tempoAtendimento,
  imagem
}: UpdateParams): Promise<Servico> => {
  const servico = await Servico.findOne({ where: { id, companyId } });

  if (!servico) {
    throw new AppError("Serviço não encontrado", 404);
  }

  await servico.update({
    nome: nome ?? servico.nome,
    descricao: descricao ?? servico.descricao,
    valorOriginal: valorOriginal ?? servico.valorOriginal,
    tempoAtendimento: tempoAtendimento ?? servico.tempoAtendimento,
    imagem: imagem ?? servico.imagem
  });

  return servico;
};

export default UpdateServicoService;
