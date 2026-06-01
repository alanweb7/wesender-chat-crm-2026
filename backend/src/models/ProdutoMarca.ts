import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType
} from "sequelize-typescript";

@Table({
  tableName: "ProdutoMarcas"
})
class ProdutoMarca extends Model<ProdutoMarca> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  companyId: number;

  @Column
  nome: string;

  @Column(DataType.TEXT)
  descricao: string;

  @Column(DataType.TEXT)
  logo: string; // nome do arquivo

  @Column(DataType.BOOLEAN)
  active: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ProdutoMarca;
