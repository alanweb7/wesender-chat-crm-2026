import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt
} from "sequelize-typescript";
import KnowledgeBase from "./KnowledgeBase";

@Table({ tableName: "KnowledgeBaseItems" })
class KnowledgeBaseItem extends Model<KnowledgeBaseItem> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => KnowledgeBase)
  @Column
  knowledgeBaseId: number;

  @BelongsTo(() => KnowledgeBase)
  knowledgeBase: KnowledgeBase;

  // "text" | "link" | "pdf" | "image"
  @AllowNull(false)
  @Column
  type: string;

  @AllowNull(true)
  @Column
  title: string;

  // Para itens de texto: o conteúdo direto
  @AllowNull(true)
  @Column(DataType.TEXT)
  content: string;

  // Para links e arquivos: a URL ou caminho
  @AllowNull(true)
  @Column(DataType.TEXT)
  url: string;

  // Para arquivos enviados: caminho local relativo a /public
  @AllowNull(true)
  @Column
  filePath: string;

  @AllowNull(true)
  @Column
  mimeType: string;

  @AllowNull(true)
  @Column(DataType.BIGINT)
  fileSize: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default KnowledgeBaseItem;
