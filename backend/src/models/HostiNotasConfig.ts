import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
} from "sequelize-typescript";

@Table
class HostiNotasConfig extends Model<HostiNotasConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  apiKey: string;

  @Default(true)
  @Column
  isActive: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default HostiNotasConfig;
