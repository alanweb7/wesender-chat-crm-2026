import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  DataType
} from "sequelize-typescript";

@Table
class CompanyDocument extends Model<CompanyDocument> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  companyId: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column({ field: 'file_path' })
  filePath: string;

  @AllowNull(false)
  @Column({ field: 'file_name' })
  fileName: string;

  @Column
  visible?: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CompanyDocument;
