import AppError from "../../errors/AppError";
import CrmClient from "../../models/CrmClient";
import CrmLead from "../../models/CrmLead";
import CrmClientContact from "../../models/CrmClientContact";
import sequelize from "../../database";

interface Request {
  id: number | string;
  companyId: number;
}

const DeleteCrmClientService = async ({
  id,
  companyId
}: Request): Promise<void> => {
  const client = await CrmClient.findOne({
    where: { id, companyId }
  });

  if (!client) {
    throw new AppError("Cliente não encontrado.", 404);
  }

  const transaction = await sequelize.transaction();

  try {
    // Remover apenas as relações de contatos (tabela intermediária)
    // O hook @BeforeDestroy do model CrmClient já cuida de deletar Contact e Lead
    await CrmClientContact.destroy({
      where: { clientId: client.id },
      transaction
    });

    // Remover relações de owners (tabela intermediária)
    const CrmClientOwner = require("../../models/CrmClientOwner").default;
    await CrmClientOwner.destroy({
      where: { clientId: client.id },
      transaction
    });

    // Deletar o cliente (o hook @BeforeDestroy será executado automaticamente)
    await client.destroy({ transaction });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    console.error("[DeleteCrmClientService] Erro ao deletar cliente:", error);
    throw error;
  }
};

export default DeleteCrmClientService;
