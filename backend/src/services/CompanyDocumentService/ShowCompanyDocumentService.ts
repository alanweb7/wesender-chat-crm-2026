import AppError from "../../errors/AppError";
import CompanyDocument from "../../models/CompanyDocument";

interface ShowDocumentParams {
  documentId: number;
  requestCompanyId: number;
  profile: string;
}

const ShowCompanyDocumentService = async ({
  documentId,
  requestCompanyId,
  profile
}: ShowDocumentParams): Promise<CompanyDocument> => {
  const document = await CompanyDocument.findByPk(documentId);

  if (!document) {
    throw new AppError("ERR_DOCUMENT_NOT_FOUND", 404);
  }

  // Se não for admin, só pode ver documentos visíveis da própria empresa
  if (profile !== "admin") {
    if (document.companyId !== requestCompanyId || !document.visible) {
      throw new AppError("ERR_PERMISSION_DENIED", 403);
    }
  }

  return document;
};

export default ShowCompanyDocumentService;
