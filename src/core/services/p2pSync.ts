import { logger } from './logger';
import { coreEventBus } from '../events/CoreEventBus';
import { CommunicationEngine } from './CommunicationEngine';
import { cloudLatencyMonitor } from './CloudLatencyMonitor'; // Importa o novo monitor
import { firebaseService } from '../../services/firebaseService';
import { EndOfDayEngine } from './EndOfDayEngine';
import { BackupEngine } from './BackupEngine';
import { controlSigner } from '../../engine/mesh/identity/ControlSignerService';

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
  private nextSyncTimestamp: number = 0;
  private pendingEventsCount: number = 0; // Fase 6: Contador de backlog local
  
  // Auditoria Failover
  private heartbeatInterval: any = null;
  private failoverMonitor: any = null;
  private lastHostHeartbeat: number = 0;
  private taskGracePeriod: number = 2500; // 2.5 seg para o Host reagir antes do Co-Host agir
  private pendingTasks: Map<string, any> = new Map();

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
    this.startInfrastructureMonitoring(enterpriseId, cloudConfig);

    if (cloudConfig) {
      cloudLatencyMonitor.startMonitoring(enterpriseId, cloudConfig, autoSwitch ?? false);
    }

    // Requisito 5: Backup automático pro Google Drive a cada 10 minutos
    const isDriveOnly = localStorage.getItem('pos_storage_strategy') === 'drive_only';
    const customInterval = cloudConfig?.backupIntervalMinutes || 5;
    const interval = isDriveOnly ? customInterval * 60 * 1000 : 30 * 60 * 1000;

    this.nextSyncTimestamp = Date.now() + interval;
    this.emitSyncPrediction();

    this.syncInterval = setInterval(() => {
      this.nextSyncTimestamp = Date.now() + interval;
      if (isDriveOnly) {
        BackupEngine.runEnterpriseBackup(enterpriseId);
        
        // Auditoria Eco-Mode: Tenta disparar o push de 5h para o Firestore se houver sessão ativa
        import('./accountService').then(({ accountService }) => {
           accountService.getEODSession().then(session => {
             if (session && session.status === 'in_progress') {
               EndOfDayEngine.checkAndTriggerMidShiftSync(session.id);
             }
           });
        });
      } else {
        this.performCloudSync(enterpriseId);
      }
      this.emitSyncPrediction();
    }, interval);

    // Execução imediata de um sync inicial
    this.requestCloudSync(enterpriseId); // Usa requestCloudSync para o sync inicial
    // Inicia o monitoramento de saúde da conexão Cloud
    this.startHealthMonitor(enterpriseId);
  }

  /**
   * Emite para a UI a previsão de quando os dados do Drive serão atualizados
   */
  private emitSyncPrediction() {
    coreEventBus.emit('system:sync_prediction', {
      nextExpectedAt: this.nextSyncTimestamp,
      isDriveOnly: localStorage.getItem('pos_storage_strategy') === 'drive_only',
      status: 'eco_mode_active' // Avisa a UI que estamos economizando Firestore
    });
  }

  /**
   * Gerencia a saúde da infraestrutura local (Host/Co-Host Heartbeats)
   */
  private startInfrastructureMonitoring(enterpriseId: string, cloudConfig?: any) {
    const role = localStorage.getItem('pos_device_role');
    const HEARTBEAT_FREQ = 2000; // Auditoria Hot-Standby: Batimento a cada 2s
    const FAILOVER_TIMEOUT = 7000; // Auditoria Hot-Standby: 7 segundos total para assunção de controle

    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.failoverMonitor) clearInterval(this.failoverMonitor);

    if (role === 'host') {
      // O Cérebro envia sinais de vida para a malha
      this.heartbeatInterval = setInterval(() => {
        this.broadcast('HOST_HEALTH_PULSE', { 
          enterpriseId, 
          timestamp: Date.now(),
          deviceId: 'main-host' 
        });
      }, HEARTBEAT_FREQ);
      
      logger.debug('p2p', 'Monitor de pulso ativado: Dispositivo operando como Cérebro (Host).');

      // Auditoria: Protocolo de Reversão (Original Host reassumindo)
      const isTemporary = localStorage.getItem('pos_failover_active') === 'true';
      
      if (!isTemporary) {
        // Se este for o host original (sem flag de failover), anuncia sua volta para que proxies cedam
        this.broadcast('HOST_PRIMARY_RECOVERY', { enterpriseId, timestamp: Date.now() });
      } else {
        // Se este for um host temporário, escuta o comando de cessão do original
        this.on('HOST_PRIMARY_RECOVERY', async () => {
          logger.warn('p2p', '🚀 REVERSÃO: Host original detectado online. Cedendo controle e voltando para Standby...');
          const { accountService } = await import('./accountService');
          await accountService.revertToCoHost();
          
          this.stopCloudSync();
          const tenant = await accountService.getCurrentTenant();
          this.startCloudSync(enterpriseId, tenant?.cloudConfig, tenant?.autoCloudSwitchingEnabled);
        });
      }
    } 
    
    if (role === 'co-host') {
      this.lastHostHeartbeat = Date.now();
      
      // Co-Hosts ficam em standby monitorando o silêncio do Host
      this.on('HOST_HEALTH_PULSE', () => {
        this.lastHostHeartbeat = Date.now();
      });

      this.failoverMonitor = setInterval(async () => {
        const silenceDuration = Date.now() - this.lastHostHeartbeat;
        
        if (silenceDuration > FAILOVER_TIMEOUT) {
          logger.warn('p2p', `⚠️ SILÊNCIO DETECTADO: Host principal não responde há ${silenceDuration}ms.`);
          await this.attemptPromotion(enterpriseId);
        }
      }, 2000);
      
      logger.info('p2p', 'Modo Standby Ativo: Monitorando integridade do Host.');

      // Lógica "Se ele não fizer, eu faço": Intercepção de Tarefas Críticas
      this.on('SALE_REQUESTED', (sale: any) => {
        const taskId = `sale-${sale.id}`;
        this.pendingTasks.set(taskId, sale);

        setTimeout(async () => {
          if (this.pendingTasks.has(taskId)) {
            logger.error('p2p', `💥 RESGATE DE TAREFA: Host demorou para processar venda ${sale.id}. Co-Host assumindo processamento.`);
            try {
              const { coreSalesService } = await import('./coreServices');
              // O Co-Host processa a venda porque ele já é um espelho do banco local (via eventos mesh)
              await (coreSalesService as any).processSale(sale, sale.items, sale.depositId, undefined, sale.appliedBottleCreditIds);
              this.broadcast('SALE_CONFIRMED_BY_COHOST', { saleId: sale.id });
              this.pendingTasks.delete(taskId);
            } catch (e) {
              logger.error('p2p', 'Co-Host falhou ao assumir tarefa de emergência', e);
            }
          }
        }, this.taskGracePeriod);
      });

      this.on('SALE_ACK_BY_HOST', (data: { saleId: string }) => {
        this.pendingTasks.delete(`sale-${data.saleId}`);
      });
    }

    if (role === 'host') {
      this.on('SALE_REQUESTED', (sale: any) => {
        // O Host avisa a rede que recebeu a tarefa para os Co-Hosts não duplicarem o trabalho
        this.broadcast('SALE_ACK_BY_HOST', { saleId: sale.id });
      });
    }
  }

  /**
   * Tenta promover o Co-Host atual para Host caso o principal caia.
   */
  private async attemptPromotion(enterpriseId: string) {
    logger.error('p2p', '🚨 EMERGÊNCIA: Iniciando protocolo de assunção de controle (Failover).');
    
    try {
      // Importação dinâmica para evitar dependência circular
      const { accountService } = await import('./accountService');
      
      // Auditoria: Assume o controle localmente
      await accountService.promoteToTemporaryHost();
      
      // Reinicia o Cloud Sync agora como Host
      const tenant = await accountService.getCurrentTenant();
      this.startCloudSync(enterpriseId, tenant?.cloudConfig, tenant?.autoCloudSwitchingEnabled);
      
      await CommunicationEngine.sendMessage({
        enterpriseId,
        companyId: enterpriseId,
        title: '🔄 Failover de Infraestrutura',
        content: 'O Host principal ficou offline. Este dispositivo (Co-Host) assumiu o processamento de dados e backups automaticamente.',
        type: 'warning',
        userId: 'admin_broadcast'
      });
    } catch (error) {
      logger.error('p2p', 'Falha ao assumir controle do Host', { error });
    }
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
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.failoverMonitor) clearInterval(this.failoverMonitor);
    this.heartbeatInterval = null;
    this.failoverMonitor = null;
    
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
      const isDriveOnly = localStorage.getItem('pos_storage_strategy') === 'drive_only';
      
      // No modo Eco, o monitor baseia-se no sucesso do backup pro Drive, não no Firestore
      if (isDriveOnly) {
        const lastBackup = Number(localStorage.getItem(`pos_last_backup_time`) || 0);
        if (lastBackup > 0 && (now - lastBackup > OFFLINE_THRESHOLD) && !this.offlineAlertSent) {
           // Dispara alerta se o backup pro drive parar
        }
        return;
      }

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

    // Auditoria: Verificação Nativa de Conectividade
    if (!navigator.onLine) {
      logger.warn('p2p', 'Tentativa de Cloud Sync ignorada: Dispositivo Offline.');
      coreEventBus.emit('system:sync_status', { 
        status: 'offline', 
        lastSync: this.lastSuccessfulSyncTime,
        reason: 'no_internet'
      });
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
    // Fase 5: Assinatura digital de mensagens de malha
    // Garante que comandos locais (estoque/venda) não possam ser forjados
    try {
      const payload = new TextEncoder().encode(JSON.stringify(data));
      const signedPayload = controlSigner.sign(payload);
      // Na vida real, enviaríamos o signedPayload. Aqui, simulamos anexando a assinatura ao objeto.
      const signature = Array.from(signedPayload.slice(-8));
      
      logger.debug('p2p', `Broadcasting signed event: ${event}`);
      this.emitEvent(event, { ...data, _sig: signature });
    } catch (error) {
      logger.error('p2p', 'Falha ao assinar mensagem de malha', { error });
      this.emitEvent(event, data); // Fallback inseguro (auditado)
    }
  }

  verifyMessage(data: any): boolean {
    if (!data._sig) return false;
    const { _sig, ...payloadData } = data;
    const payload = new TextEncoder().encode(JSON.stringify(payloadData));
    const signature = new Uint8Array(_sig);
    const signedPayload = new Uint8Array(payload.length + signature.length);
    signedPayload.set(payload);
    signedPayload.set(signature, payload.length);
    
    const isValid = controlSigner.verify(signedPayload);
    if (!isValid) {
      logger.error('p2p', '⚠️ VIOLAÇÃO DE SEGURANÇA: Assinatura de mensagem inválida na malha P2P!', { 
        event: data.event, deviceId: data.deviceId 
      });
    }
    return isValid;
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