import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import RatingConfig from "./RatingConfig";

@Table({ tableName: "RatingOptions" })
class RatingOption extends Model<RatingOption> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => RatingConfig)
  @Column
  ratingConfigId: number;

  @BelongsTo(() => RatingConfig)
  ratingConfig: RatingConfig;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  value: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default RatingOption;
