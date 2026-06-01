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
  tableName: "ProdutoCustomFieldDefinitions"
})
class ProdutoCustomFieldDefinition extends Model<ProdutoCustomFieldDefinition> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  companyId: number;

  @Column
  nome: string;

  @Column
  chave: string; // slug/identifier ex: "producao", "ano"

  @Column
  tipo: string; // texto, numero, data, boolean, select

  @Column(DataType.JSON)
  opcoes: any; // para tipo select: array de opções

  @Column(DataType.BOOLEAN)
  obrigatorio: boolean;

  @Column(DataType.INTEGER)
  ordem: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default ProdutoCustomFieldDefinition;
