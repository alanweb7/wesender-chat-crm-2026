import RatingConfig from "../../models/RatingConfig";
import RatingOption from "../../models/RatingOption";

interface OptionInput {
  name: string;
  value: number;
}

interface Request {
  name: string;
  message: string;
  type: string;
  companyId: number;
  options?: OptionInput[];
}

const CreateService = async ({ name, message, type, companyId, options = [] }: Request): Promise<RatingConfig> => {
  const record = await RatingConfig.create({ name, message, type, companyId });

  if (options.length > 0) {
    const optionRows = options.map(o => ({
      ratingConfigId: record.id,
      name: o.name,
      value: o.value,
      companyId,
    }));
    await RatingOption.bulkCreate(optionRows);
  }

  const full = await RatingConfig.findByPk(record.id, {
    include: [{ model: RatingOption, as: "options" }],
  });

  return full;
};

export default CreateService;
