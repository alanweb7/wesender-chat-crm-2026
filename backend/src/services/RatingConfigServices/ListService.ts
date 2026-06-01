import { Op } from "sequelize";
import RatingConfig from "../../models/RatingConfig";
import RatingOption from "../../models/RatingOption";

interface Request {
  companyId: number;
  searchParam?: string;
  pageNumber?: string | number;
}

interface Response {
  records: RatingConfig[];
  count: number;
  hasMore: boolean;
}

const ListService = async ({
  companyId,
  searchParam = "",
  pageNumber = "1"
}: Request): Promise<Response> => {
  const pageSize = 20;
  const offset = pageSize * (+pageNumber - 1);

  const whereCondition: any = { companyId };

  if (searchParam) {
    whereCondition.name = { [Op.iLike]: `%${searchParam}%` };
  }

  const { count, rows: records } = await RatingConfig.findAndCountAll({
    where: whereCondition,
    include: [
      {
        model: RatingOption,
        as: "options",
        order: [["value", "ASC"]],
      },
    ],
    limit: pageSize,
    offset,
    order: [["name", "ASC"]],
  });

  const hasMore = count > offset + records.length;

  return { records, count, hasMore };
};

export default ListService;
