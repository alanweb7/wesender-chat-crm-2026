import Servico from "../../models/Servico";
import AppError from "../../errors/AppError";

interface CreateServicoData {
  companyId: number;
  nome: string;
  descricao?: string;
  valorOriginal?: number;
  tempoAtendimento?: number | null;
  imagem?: string | null;
}

const CreateServicoService = async ({
  companyId,
  nome,
  descricao,
  valorOriginal = 0,
  tempoAtendimento = null,
  imagem = null
}: CreateServicoData): Promise<Servico> => {
  if (!nome?.trim()) {
    throw new AppError("Nome do serviço é obrigatório");
  }

  const servico = await Servico.create({
    companyId,
    nome,
    descricao,
    valorOriginal,
    tempoAtendimento,
    imagem
  });

  return servico;
};

export default CreateServicoService;
