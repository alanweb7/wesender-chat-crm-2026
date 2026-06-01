// @ts-nocheck
import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  AutoIncrement
} from "sequelize-typescript";
import Produto from "./Produto";
import Whatsapp from "./Whatsapp";

@Table({ tableName: "ProdutoWhatsappSync" })
class ProdutoWhatsappSync extends Model<ProdutoWhatsappSync> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Produto)
  @Column
  produtoId: number;

  @BelongsTo(() => Produto)
  produto: Produto;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  // ID retornado pelo Baileys ao publicar no catálogo
  @Column(DataType.STRING(255))
  whatsappProductId: string | null;

  // Status da última sincronização
  @Column({ type: DataType.STRING(20), defaultValue: "pending" })
  syncStatus: string; // pending | synced | error

  @Column(DataType.TEXT)
  syncError: string | null;

  @Column(DataType.DATE)
  lastSyncAt: Date | null;
}

export default ProdutoWhatsappSync;
