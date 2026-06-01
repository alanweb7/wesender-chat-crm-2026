import AppError from "../../errors/AppError";
import CompanyDocument from "../../models/CompanyDocument";
import User from "../../models/User";

interface ListDocumentsParams {
  searchParam?: string;
  pageNumber?: string;
  companyId: number;
  requestCompanyId: number;
  profile: string;
}

const ListCompanyDocumentsService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId,
  requestCompanyId,
  profile
}: ListDocumentsParams): Promise<CompanyDocument[]> => {
  console.log("🔍 ListCompanyDocumentsService - Parâmetros:", {
    searchParam,
    pageNumber,
    companyId,
    requestCompanyId,
    profile
  });

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  let whereCondition: any = {};

  // Se não for admin, só pode ver documentos visíveis da própria empresa
  if (profile !== "admin") {
    console.log("👤 Usuário não-admin, filtrando documentos visíveis da própria empresa");
    if (companyId !== requestCompanyId) {
      throw new AppError("ERR_PERMISSION_DENIED", 403);
    }
    whereCondition.companyId = companyId;
    whereCondition.visible = true;
  } else {
    console.log("👑 Usuário admin, pode ver todos os documentos");
    // Admin pode ver todos os documentos (visíveis e não visíveis) de qualquer empresa
    if (companyId) {
      whereCondition.companyId = companyId;
    }
  }

  // Adicionar filtro de busca
  if (searchParam) {
    whereCondition.name = {
      [require("sequelize").Op.iLike]: `%${searchParam}%`
    };
  }

  console.log("🔍 Where condition:", whereCondition);

  const { count, rows: documents } = await CompanyDocument.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["createdAt", "DESC"]]
  });

  console.log("📊 Resultado da query:", { count, documentsCount: documents.length });
  console.log("📄 Documentos encontrados:", documents.map(d => ({
    id: d.id,
    name: d.name,
    companyId: d.companyId,
    visible: d.visible
  })));

  const hasMore = count > offset + documents.length;

  return documents;
};

export default ListCompanyDocumentsService;
