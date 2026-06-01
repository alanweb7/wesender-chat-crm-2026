import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Plan from "../../models/Plan";

interface PlanData {
  name: string;
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
  trial?: boolean;
  trialDays?: number;
  recurrence?: string;
  useOpenAi?: boolean;
  useIntegrations?: boolean;
  isPublic?: boolean;
  nfLimit?: number;
  nfPricePerExtra?: number;
  nfBillingEnabled?: boolean;
}

const CreatePlanService = async (planData: PlanData): Promise<Plan> => {
  const { name, nfPricePerExtra, ...restData } = planData;

  const planSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_PLAN_INVALID_NAME")
      .required("ERR_PLAN_INVALID_NAME")
      .test(
        "Check-unique-name",
        "ERR_PLAN_NAME_ALREADY_EXISTS",
        async value => {
          if (value) {
            const planWithSameName = await Plan.findOne({
              where: { name: value }
            });

            return !planWithSameName;
          }
          return false;
        }
      )
  });

  try {
    await planSchema.validate({ name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Converter valores para formato correto antes de salvar
  const dataToSave = {
    name,
    ...restData,
    nfLimit: restData.nfLimit || 0,
    nfPricePerExtra: nfPricePerExtra ? parseFloat(nfPricePerExtra.toString().replace(',', '.')) : 0,
    nfBillingEnabled: restData.nfBillingEnabled || false
  };

  const plan = await Plan.create(dataToSave);

  return plan;
};

export default CreatePlanService;
