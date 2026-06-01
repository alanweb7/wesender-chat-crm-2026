import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Produto from "./Produto";
import ProdutoCustomFieldDefinition from "./ProdutoCustomFieldDefinition";

@Table({
  tableName: "ProdutoCustomFieldValues"
})
class ProdutoCustomFieldValue extends Model<ProdutoCustomFieldValue> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Produto)
  @Column
  produtoId: number;

  @ForeignKey(() => ProdutoCustomFieldDefinition)
  @Column
  fieldDefinitionId: number;

  @Column(DataType.TEXT)
  valorTexto: string;

  @Column(DataType.DECIMAL(12, 2))
  valorNumero: number;

  @Column(DataType.DATE)
  valorData: Date;

  @Column(DataType.BOOLEAN)
  valorBoolean: boolean;

  @BelongsTo(() => Produto)
  produto: Produto;

  @BelongsTo(() => ProdutoCustomFieldDefinition)
  fieldDefinition: ProdutoCustomFieldDefinition;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ProdutoCustomFieldValue;
