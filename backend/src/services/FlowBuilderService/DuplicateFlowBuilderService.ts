import { FlowBuilderModel } from "../../models/FlowBuilder";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";

interface Request {
  id: number;
  name?: string;
}

const DuplicateFlowBuilderService = async ({
  id,
  name
}: Request): Promise<FlowBuilderModel> => {
  try {
    const flow = await FlowBuilderModel.findOne({
      where: {
        id: id
      }
    });

    const finalName = name || (flow.name + " - copy");
    console.log("[DuplicateService] name param:", name, "| finalName:", finalName);

    const duplicate = await FlowBuilderModel.create({
      name: finalName,
      flow: flow.flow,
      user_id: flow.user_id,
      company_id: flow.company_id
    });

    console.log("[DuplicateService] created with name:", duplicate.name);
    return duplicate;
  } catch (error) {
    console.error("Erro ao inserir o usuário:", error);

    return error;
  }
};

export default DuplicateFlowBuilderService;
