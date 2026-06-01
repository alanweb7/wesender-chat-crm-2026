import AppError from "../../errors/AppError";
import RatingConfig from "../../models/RatingConfig";
import RatingOption from "../../models/RatingOption";

const DeleteService = async (id: string | number, companyId: number): Promise<void> => {
  const record = await RatingConfig.findOne({ where: { id, companyId } });

  if (!record) {
    throw new AppError("ERR_NO_RATING_CONFIG_FOUND", 404);
  }

  await RatingOption.destroy({ where: { ratingConfigId: record.id } });
  await record.destroy();
};

export default DeleteService;
