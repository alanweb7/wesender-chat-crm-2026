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
  HasMany,
  DataType,
  AllowNull,
  Default
} from "sequelize-typescript";
import Company from "./Company";
import RatingOption from "./RatingOption";

@Table({ tableName: "RatingConfigs" })
class RatingConfig extends Model<RatingConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  message: string;

  @Default("message")
  @Column
  type: string; // "message" | "web"

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => RatingOption, { foreignKey: "ratingConfigId", onDelete: "CASCADE" })
  options: RatingOption[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default RatingConfig;
