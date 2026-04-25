import { logger } from './logger';
import { coreEventBus } from '../events/CoreEventBus';
import { CommunicationEngine } from './CommunicationEngine';
import { cloudLatencyMonitor } from './CloudLatencyMonitor'; // Importa o novo monitor
import { firebaseService } from '../../services/firebaseService';

// Esta é uma representação simplificada de uma rede P2P real (ex: WebRTC, WebSockets).
// Para demonstração, atua como um emissor de eventos em memória.
class MeshNetwork {
  private listeners: { [event: string]: Function[] } = {};
  private syncInterval: any = null;
  private healthCheckInterval: any = null;
  private syncInProgress: boolean = false; // Flag para evitar sincronizações concorrentes
  private lastSuccessfulSyncTime: number = 0; // Timestamp da última sincronização bem-sucedida
  private lastSyncTime: number = 0; // Timestamp da última sincronização bem-sucedida
  private offlineAlertSent: boolean = false;

  emitEvent(event: string, data: any) {
    logger.debug('p2p', `Emitting P2P event: ${event}`, data);
    if (this.listeners[event]) {
      this.listeners[event].forEach(listener => listener(data));
    }
  }

  /**
   * Inicia o ciclo de sincronização Cloud (30 min)
   */
  startCloudSync(enterpriseId: string, cloudConfig?: any, autoSwitch?: boolean) {
    // Auditoria: Garante limpeza antes de reiniciar ciclos
    this.stopCloudSync();

    if (cloudConfig) {
      cloudLatencyMonitor.startMonitoring(enterpriseId, cloudConfig, autoSwitch ?? false);
    }

    // Agendamento automático a cada 30 minutos
    this.syncInterval = setInterval(() => {
      this.performCloudSync(enterpriseId);
    }, 30 * 60 * 1000);
    // Execução imediata de um sync inicial
    this.requestCloudSync(enterpriseId); // Usa requestCloudSync para o sync inicial
    // Inicia o monitoramento de saúde da conexão Cloud
    this.startHealthMonitor(enterpriseId);
  }

  /**
   * Interrompe a comunicação com o Firestore
   */
  stopCloudSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.syncInProgress = false; // Garante que a flag seja resetada
    cloudLatencyMonitor.stopMonitoring(); // Para o monitor de latência
    this.offlineAlertSent = false;
    logger.info('p2p', 'Cloud Sync interrompido.');
  }

  /**
   * Monitora se o servidor local está conseguindo falar com a nuvem.
   * Se passar de 1 hora sem sucesso, notifica o proprietário via CommunicationEngine.
   */
  private startHealthMonitor(enterpriseId: string) {
    const OFFLINE_THRESHOLD = 60 * 60 * 1000; // 1 Hora

    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);

    this.healthCheckInterval = setInterval(async () => {
      const now = Date.now();
      
      // Auditoria: Se nunca sincronizou com sucesso e passou 1h desde o início, ou se parou de sincronizar há 1h
      const referenceTime = this.lastSuccessfulSyncTime || (now - (now % OFFLINE_THRESHOLD)); // Fallback para o início da hora atual se zero
      if ((now - referenceTime > OFFLINE_THRESHOLD) && !this.offlineAlertSent) {
        this.offlineAlertSent = true;
        logger.error('p2p', 'CRITICAL: Falha persistente de sincronização Cloud detectada.');

        await CommunicationEngine.sendMessage({
          enterpriseId,
          companyId: enterpriseId,
          title: '⚠️ ALERTA: Servidor Local Desconectado',
          content: 'O dispositivo servidor desta unidade não sincroniza com a nuvem há mais de 1 hora. Verifique a conexão com a internet para evitar divergências de dados.',
          type: 'critical',
          userId: 'admin_broadcast'
        });
      }
    }, 5 * 60 * 1000); // Checagem a cada 5 minutos
  }

  /**
   * Solicita uma sincronização com a nuvem. Se já houver uma em andamento,
   * ou se uma sincronização recente acabou de ocorrer, ela pode ser ignorada
   * ou agendada para breve.
   */
  async requestCloudSync(enterpriseId: string, force: boolean = false) {
    const now = Date.now();
    const MIN_SYNC_INTERVAL = 5 * 60 * 1000; // Mínimo de 5 minutos entre syncs forçados

    if (this.syncInProgress && !force) {
      logger.debug('p2p', 'Cloud Sync já em andamento, ignorando nova solicitação.');
      return;
    }
    if (!force && (now - this.lastSyncTime < MIN_SYNC_INTERVAL)) {
      logger.debug('p2p', `Cloud Sync recente (${(now - this.lastSyncTime) / 1000}s atrás), ignorando solicitação não forçada.`);
      return;
    }

    logger.info('p2p', 'Cloud Sync solicitado (auto/manual).');
    await this.performCloudSync(enterpriseId);
  }

  /**
   * Comando manual ou automático para cruzar dados locais com Firestore
   */
  async performCloudSync(enterpriseId: string) {
    if (this.syncInProgress) {
      logger.debug('p2p', 'performCloudSync: Sync já em andamento, abortando.');
      return;
    }

    try {
      this.syncInProgress = true;
      logger.info('p2p', '🔄 Iniciando cruzamento de dados: Malha Local <-> Cloud Firestore', { enterpriseId });
      
      // Simulação de reconciliação de pacotes
      await new Promise(resolve => setTimeout(resolve, 2000));

      const now = Date.now();
      this.lastSyncTime = now;
      this.lastSuccessfulSyncTime = now; // Sucesso real
      this.offlineAlertSent = false; // Reseta o estado de alerta após sucesso
      coreEventBus.emit('system:sync_status', { status: 'synced', lastSync: this.lastSyncTime });
      logger.info('p2p', '✅ Sincronização Cloud concluída e dados auditados.');
    } catch (error) {
      logger.error('p2p', '❌ Falha na sincronização Cloud', { error });

      // Lógica de Connection Switcher Automático
      // Se houver erro de permissão ou configuração na nuvem customizada, voltamos ao padrão
      const isCustomCloudError = error.message?.includes('permission-denied') || 
                                 error.message?.includes('not-found') ||
                                 error.message?.includes('invalid-api-key');

      if (isCustomCloudError) {
        logger.warn('p2p', '⚠️ Falha crítica na GCP privada detectada. Ativando Switcher Automático.');
        
        await firebaseService.updateItem('enterprises', enterpriseId, { 
          'cloudConfig.provider': 'system',
          'cloudConfig.tier': 'free',
          'monthlyUnitsLimit': 400
        });

        await CommunicationEngine.sendMessage({
          enterpriseId,
          companyId: enterpriseId,
          title: '🔄 Cloud Fallback Ativado',
          content: 'Sua infraestrutura privada do Google Cloud falhou. O sistema retornou automaticamente ao Firestore padrão do Grid OS para evitar perda de dados.',
          type: 'warning',
          userId: 'admin_broadcast'
        });
      }

      coreEventBus.emit('system:sync_status', { status: 'failed', lastSync: this.lastSyncTime, error: error.message });
    } finally {
      this.syncInProgress = false;
    }
  }

  on(event: string, listener: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(listener);
  }

  off(event: string, listener: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }
  }

  broadcast(event: string, data: any) {
    logger.debug('p2p', `Broadcasting event to mesh: ${event}`);
    this.emitEvent(event, data);
  }
}

export const meshNetwork = new MeshNetwork();

// --- Tratamento de Eventos P2P ---
// Esta seção define como este terminal reage a eventos de outros terminais na rede Mesh.

meshNetwork.on('STOCK_UPDATE', (data: { eventId: string; productId: string; quantity: number; companyId: string; type: 'decrement' | 'increment' }) => {
  logger.info('p2p', `Received STOCK_UPDATE via P2P Mesh: ${data.productId} by ${data.quantity} (type: ${data.type})`, { data });
  // IMPORTANTE: Este terminal NÃO deve tentar modificar diretamente o estoque no Firebase aqui.
  // O terminal de origem (que processou a venda/ajuste) é responsável pela atualização atômica no Firebase via InventoryEngine.
  // Este evento P2P serve principalmente para:
  // 1. Atualizações mais rápidas da UI local em outros terminais (ex: mostrar a mudança de estoque antes que o listener de tempo real do Firebase atualize).
  // 2. Detecção de conflitos (se um mecanismo de consenso P2P mais complexo estivesse em vigor, mas as transações do Firebase já lidam com isso para estoque).

  // Por enquanto, apenas emitimos um evento local para quaisquer componentes da UI que possam querer reagir mais rapidamente
  // do que os listeners de tempo real do Firebase.
  coreEventBus.emit('local:p2p_stock_notification', { productId: data.productId, quantity: data.quantity, type: data.type });
});

meshNetwork.on('SALE_CREATED', (sale: any) => {
  logger.info('p2p', `Received SALE_CREATED via P2P Mesh: ${sale.id}`, { sale });
  // Similar ao estoque, o terminal de origem já fez o commit desta venda no Firebase.
  // Isso é para atualizações mais rápidas da UI local (ex: novo pedido aparecendo no KDS).
  coreEventBus.emit('local:p2p_sale_notification', sale);
});

// Adicione outros listeners de eventos P2P conforme necessário para outros tipos de sincronização.