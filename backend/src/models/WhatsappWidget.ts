import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  Unique
} from "sequelize-typescript";
import Company from "./Company";
import Whatsapp from "./Whatsapp";

@Table
class WhatsappWidget extends Model<WhatsappWidget> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @Unique
  @Column(DataType.STRING(12))
  code: string;

  @Column
  name: string;

  @AllowNull
  @Column
  welcomeMessage: string;

  @Default("#25D366")
  @Column
  buttonColor: string;

  @Default("bottom-right")
  @Column(DataType.ENUM("bottom-right", "bottom-left"))
  buttonPosition: string;

  @Default(true)
  @Column
  active: boolean;

  @Default(0)
  @Column
  totalClicks: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;
}

export default WhatsappWidget;
