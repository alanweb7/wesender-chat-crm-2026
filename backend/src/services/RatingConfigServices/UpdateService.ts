import AppError from "../../errors/AppError";
import RatingConfig from "../../models/RatingConfig";
import RatingOption from "../../models/RatingOption";

interface OptionInput {
  name: string;
  value: number;
}

interface Request {
  id: string | number;
  companyId: number;
  name?: string;
  message?: string;
  type?: string;
  options?: OptionInput[];
}

const UpdateService = async ({ id, companyId, name, message, type, options }: Request): Promise<RatingConfig> => {
  const record = await RatingConfig.findOne({ where: { id, companyId } });

  if (!record) {
    throw new AppError("ERR_NO_RATING_CONFIG_FOUND", 404);
  }

  await record.update({ name, message, type });

  // Replace all options
  if (options !== undefined) {
    await RatingOption.destroy({ where: { ratingConfigId: record.id } });

    if (options.length > 0) {
      const optionRows = options.map(o => ({
        ratingConfigId: record.id,
        name: o.name,
        value: o.value,
        companyId,
      }));
      await RatingOption.bulkCreate(optionRows);
    }
  }

  const full = await RatingConfig.findByPk(record.id, {
    include: [{ model: RatingOption, as: "options" }],
  });

  return full;
};

export default UpdateService;
