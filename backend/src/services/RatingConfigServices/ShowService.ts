import AppError from "../../errors/AppError";
import RatingConfig from "../../models/RatingConfig";
import RatingOption from "../../models/RatingOption";

const ShowService = async (id: string | number, companyId: number): Promise<RatingConfig> => {
  const record = await RatingConfig.findOne({
    where: { id, companyId },
    include: [
      {
        model: RatingOption,
        as: "options",
        order: [["value", "ASC"]],
      },
    ],
  });

  if (!record) {
    throw new AppError("ERR_NO_RATING_CONFIG_FOUND", 404);
  }

  return record;
};

export default ShowService;
