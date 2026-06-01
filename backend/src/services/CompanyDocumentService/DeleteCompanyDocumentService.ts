import AppError from "../../errors/AppError";
import CompanyDocument from "../../models/CompanyDocument";
import fs from "fs";
import path from "path";

const DeleteCompanyDocumentService = async (documentId: number): Promise<void> => {
  const document = await CompanyDocument.findByPk(documentId);

  if (!document) {
    throw new AppError("ERR_DOCUMENT_NOT_FOUND", 404);
  }

  // Remover o arquivo físico do servidor
  if (document.filePath && fs.existsSync(document.filePath)) {
    try {
      fs.unlinkSync(document.filePath);
    } catch (error) {
      console.error("Error deleting file:", error);
      // Não falhar a exclusão do registro se o arquivo não puder ser excluído
    }
  }

  await document.destroy();
};

export default DeleteCompanyDocumentService;
