import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Unique,
  Default,
  DataType
} from "sequelize-typescript";

@Table
class Plan extends Model<Plan> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @Column
  users: number;

  @Column
  connections: number;

  @Column
  queues: number;

  @Column
  amount: string;   

  @Column
  useWhatsapp: boolean;   

  @Column
  useFacebook: boolean;   

  @Column
  useInstagram: boolean;   
  
  @Column
  useCampaigns: boolean;   

  @Column
  useSchedules: boolean;   

  @Column
  useInternalChat: boolean;   
  
  @Column
  useExternalApi: boolean;   

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  useKanban: boolean;

  @Column
  trial: boolean;

  @Column
  trialDays: number;

  @Column
  recurrence: string;

  @Column
  useOpenAi: boolean;

  @Column
  useIntegrations: boolean;

  @Default(true)
  @Column
  isPublic: boolean;

  @Column(DataType.DECIMAL(5, 2))
  affiliateCommissionRate?: number; // Percentual de comissão para afiliados

  @Column
  nfLimit?: number; // Limite de notas fiscais permitidas no plano

  @Column(DataType.DECIMAL(10, 2))
  nfPricePerExtra?: number; // Valor cobrado por nota fiscal emitida após atingir o limite

  @Column
  nfBillingEnabled?: boolean; // Se a cobrança por notas fiscais está ativada

  @Column
  nfCurrentCount?: number; // Contador atual de notas fiscais emitidas no período

  @Column
  nfLastResetDate?: Date; // Data da última reinicialização do contador de notas
}

export default Plan;
