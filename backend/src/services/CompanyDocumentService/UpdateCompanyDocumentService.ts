import AppError from "../../errors/AppError";
import CompanyDocument from "../../models/CompanyDocument";

interface UpdateDocumentParams {
  documentId: number;
  name?: string;
  description?: string;
  isVisibleToCompany?: boolean;
}

const UpdateCompanyDocumentService = async ({
  documentId,
  name,
  description,
  isVisibleToCompany
}: UpdateDocumentParams): Promise<CompanyDocument> => {
  const document = await CompanyDocument.findByPk(documentId);

  if (!document) {
    throw new AppError("ERR_DOCUMENT_NOT_FOUND", 404);
  }

  const updateData: any = {};
  
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (isVisibleToCompany !== undefined) updateData.isVisibleToCompany = isVisibleToCompany;

  await document.update(updateData);

  return document;
};

export default UpdateCompanyDocumentService;
