import AppError from "../../errors/AppError";
import Plan from "../../models/Plan";
import ShowPlanService from "./ShowPlanService";

interface PlanData {
  name: string;
  id?: number | string;
  users?: number;
  connections?: number;
  queues?: number;
  amount?: string;
  useWhatsapp?: boolean;
  useFacebook?: boolean;
  useInstagram?: boolean;
  useCampaigns?: boolean;
  useSchedules?: boolean;
  useInternalChat?: boolean;
  useExternalApi?: boolean;
  useKanban?: boolean;
  useOpenAi?: boolean;
  useIntegrations?: boolean;
  isPublic?: boolean;
  nfLimit?: number;
  nfPricePerExtra?: number;
  nfBillingEnabled?: boolean;
}

const UpdatePlanService = async (planData: PlanData): Promise<Plan> => {
  const { id, nfPricePerExtra, ...restData } = planData;

  let plan = await Plan.findByPk(id);

  if (!plan) {
    throw new AppError("ERR_NO_PLAN_FOUND", 404);
  }

  // Converter valores para formato correto antes de salvar
  const dataToSave = {
    ...restData,
    nfLimit: restData.nfLimit || 0,
    nfPricePerExtra: nfPricePerExtra ? parseFloat(nfPricePerExtra.toString().replace(',', '.')) : 0,
    nfBillingEnabled: restData.nfBillingEnabled || false
  };

  await plan.update(dataToSave);

  return plan;
};

export default UpdatePlanService;
