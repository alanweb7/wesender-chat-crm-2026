import { WASocket } from "@whiskeysockets/baileys";
import logger from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import { getIO } from "../../libs/socket";

interface ConnectionStats {
  disconnectedAt?: Date;
  reconnectedAt?: Date;
  disconnectionCount: number;
  totalDowntime: number;
}

class WhatsAppMonitor {
  private connections: Map<number, ConnectionStats> = new Map();
  private reconnectAttempts: Map<number, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 segundo inicial

  constructor() {
    this.startHealthCheck();
  }

  // Monitorar desconexões
  onConnectionLost(whatsappId: number) {
    const stats = this.connections.get(whatsappId) || {
      disconnectionCount: 0,
      totalDowntime: 0
    };

    stats.disconnectedAt = new Date();
    stats.disconnectionCount++;
    this.connections.set(whatsappId, stats);

    logger.error(`[WHATSAPP MONITOR] Conexão perdida - WhatsApp ID: ${whatsappId}, Desconexões: ${stats.disconnectionCount}`);
    
    // Notificar frontend
    this.notifyConnectionStatus(whatsappId, 'disconnected');
  }

  // Monitorar reconexões
  onConnectionRestored(whatsappId: number) {
    const stats = this.connections.get(whatsappId);
    if (!stats || !stats.disconnectedAt) return;

    const reconnectedAt = new Date();
    const downtime = reconnectedAt.getTime() - stats.disconnectedAt.getTime();
    
    stats.reconnectedAt = reconnectedAt;
    stats.totalDowntime += downtime;
    this.connections.set(whatsappId, stats);

    // Resetar tentativas de reconexão
    this.reconnectAttempts.delete(whatsappId);

    logger.info(`[WHATSAPP MONITOR] Conexão restaurada - WhatsApp ID: ${whatsappId}, Downtime: ${downtime}ms`);
    
    // Notificar frontend
    this.notifyConnectionStatus(whatsappId, 'connected');
  }

  // Tentativa de reconexão automática
  async attemptReconnection(whatsappId: number): Promise<boolean> {
    const attempts = this.reconnectAttempts.get(whatsappId) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      logger.error(`[WHATSAPP MONITOR] Máximo de tentativas de reconexão atingido - WhatsApp ID: ${whatsappId}`);
      return false;
    }

    this.reconnectAttempts.set(whatsappId, attempts + 1);
    
    // Exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, attempts);
    
    logger.info(`[WHATSAPP MONITOR] Tentativa ${attempts + 1}/${this.maxReconnectAttempts} de reconexão em ${delay}ms - WhatsApp ID: ${whatsappId}`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      // Aqui você pode implementar a lógica de reconexão
      // Por enquanto, apenas simulamos uma tentativa
      const whatsapp = await Whatsapp.findByPk(whatsappId);
      if (whatsapp && whatsapp.status === 'disconnected') {
        // Implementar reconexão real aqui
        logger.info(`[WHATSAPP MONITOR] Reconectando WhatsApp ID: ${whatsappId}`);
        return true;
      }
    } catch (error) {
      logger.error(`[WHATSAPP MONITOR] Erro na tentativa de reconexão - WhatsApp ID: ${whatsappId}`, error);
    }
    
    return false;
  }

  // Notificar frontend sobre status da conexão
  private notifyConnectionStatus(whatsappId: number, status: 'connected' | 'disconnected') {
    try {
      const io = getIO();
      io.emit(`whatsapp-${whatsappId}-connection`, {
        status,
        timestamp: new Date(),
        stats: this.connections.get(whatsappId)
      });
    } catch (error) {
      logger.error(`[WHATSAPP MONITOR] Erro ao notificar frontend - WhatsApp ID: ${whatsappId}`, error);
    }
  }

  // Health check periódico
  private startHealthCheck() {
    setInterval(async () => {
      await this.checkAllConnections();
    }, 30000); // Verificar a cada 30 segundos
  }

  // Verificar todas as conexões
  private async checkAllConnections() {
    try {
      const whatsapps = await Whatsapp.findAll({
        where: { status: 'connected' }
      });

      for (const whatsapp of whatsapps) {
        const stats = this.connections.get(whatsapp.id);
        
        // Se está desconectado há mais de 5 minutos, tentar reconexão
        if (stats?.disconnectedAt && !stats.reconnectedAt) {
          const disconnectedTime = new Date().getTime() - stats.disconnectedAt.getTime();
          
          if (disconnectedTime > 5 * 60 * 1000) { // 5 minutos
            logger.warn(`[WHATSAPP MONITOR] Detectada desconexão longa - WhatsApp ID: ${whatsapp.id}, Tempo: ${disconnectedTime}ms`);
            await this.attemptReconnection(whatsapp.id);
          }
        }
      }
    } catch (error) {
      logger.error('[WHATSAPP MONITOR] Erro no health check', error);
    }
  }

  // Obter estatísticas de conexão
  getConnectionStats(whatsappId: number): ConnectionStats | null {
    return this.connections.get(whatsappId) || null;
  }

  // Obter todas as estatísticas
  getAllConnectionStats(): Map<number, ConnectionStats> {
    return new Map(this.connections);
  }

  // Resetar estatísticas
  resetStats(whatsappId: number) {
    this.connections.delete(whatsappId);
    this.reconnectAttempts.delete(whatsappId);
    logger.info(`[WHATSAPP MONITOR] Estatísticas resetadas - WhatsApp ID: ${whatsappId}`);
  }
}

export default new WhatsAppMonitor();
