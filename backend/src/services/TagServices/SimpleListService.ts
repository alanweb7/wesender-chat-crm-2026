import { Op, Sequelize, literal } from "sequelize";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";

interface Request {
  companyId: number;
  searchParam?: string;
  kanban?: number;
}

const ListService = async ({
  companyId,
  searchParam,
  kanban = 0
}: Request): Promise<Tag[]> => {
  let whereCondition = {};

  if (searchParam) {
    whereCondition = {
      [Op.or]: [
        { name: { [Op.like]: `%${searchParam}%` } },
        { color: { [Op.like]: `%${searchParam}%` } }
      ]
    };
  }

  const tags = await Tag.findAll({
    where: { ...whereCondition, companyId, kanban },
    order: [["name", "ASC"]],
    attributes: {
      exclude: ["createdAt", "updatedAt"],
      include: [
        [
          literal(`(SELECT COUNT(*) FROM "ContactTags" AS ct WHERE ct."tagId" = "Tag"."id")`),
          "contactsCount"
        ]
      ]
    }
  });

  return tags;
};

export default ListService;
