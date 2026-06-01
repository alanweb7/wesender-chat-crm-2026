import AppError from "../../errors/AppError";
import CompanyDocument from "../../models/CompanyDocument";

interface DocumentData {
  companyId: number;
  name: string;
  filePath: string;
  fileName: string;
  visible?: boolean;
}

const CreateCompanyDocumentService = async (documentData: DocumentData): Promise<CompanyDocument> => {
  const document = await CompanyDocument.create({
    companyId: documentData.companyId,
    name: documentData.name,
    filePath: documentData.filePath,
    fileName: documentData.fileName,
    visible: documentData.visible !== undefined ? documentData.visible : true, // Default true
  });

  return document;
};

export default CreateCompanyDocumentService;
