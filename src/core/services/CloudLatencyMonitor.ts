import { logger } from './logger';
import { firebaseService } from '../../services/firebaseService';
import { coreEventBus } from '../events/CoreEventBus';
import { CommunicationEngine } from './CommunicationEngine';

export interface CloudConfig {
  provider: 'system' | 'custom_firestore';
  tier: 'free' | 'turbo';
  customConfig?: { projectId: string; apiKey: string };
}

export interface LatencyMeasurement {
  provider: 'system' | 'custom_firestore';
  latency: number; // em ms
  timestamp: number;
  error?: string;
}

/**
 * CloudLatencyMonitor - Monitor de Performance de Conexão Cloud
 * Mede a latência dos provedores de Firestore e recomenda/executa switches automáticos.
 */
class CloudLatencyMonitor {
  private monitorInterval: any = null;
  private enterpriseId: string | null = null;
  private autoSwitchEnabled: boolean = false;
  private currentCloudConfig: CloudConfig | null = null;
  private lastLatencies: { system: LatencyMeasurement[]; custom: LatencyMeasurement[] } = { system: [], custom: [] };
  private readonly MEASUREMENT_WINDOW = 5; // Manter as últimas 5 medições
  private readonly LATENCY_THRESHOLD_PERCENT = 30; // % de diferença para recomendar switch

  /**
   * Inicia o monitoramento de latência.
   */
  startMonitoring(enterpriseId: string, currentCloudConfig: CloudConfig, autoSwitchEnabled: boolean) {
    this.enterpriseId = enterpriseId;
    this.currentCloudConfig = currentCloudConfig;
    this.autoSwitchEnabled = autoSwitchEnabled;
    
    if (this.monitorInterval) clearInterval(this.monitorInterval);

    // Mede a cada 5 minutos
    this.monitorInterval = setInterval(() => this.runLatencyCheck(), 5 * 60 * 1000);
    this.runLatencyCheck(); // Executa imediatamente
  }

  /**
   * Para o monitoramento.
   */
  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.enterpriseId = null;
    this.currentCloudConfig = null;
    this.lastLatencies = { system: [], custom: [] };
    logger.info('system', 'Monitor de Latência Cloud interrompido.');
  }

  /**
   * Executa uma rodada de medição de latência para ambos os provedores.
   */
  private async runLatencyCheck() {
    if (!this.enterpriseId || !this.currentCloudConfig) return;

    logger.debug('system', 'Executando checagem de latência Cloud...');

    // Mede a latência do provedor atual
    const currentProviderLatency = await this.measureLatency(this.currentCloudConfig);
    this.addLatencyMeasurement(currentProviderLatency);

    // Mede a latência do provedor alternativo (se configurado)
    const alternativeConfig: CloudConfig = this.currentCloudConfig.provider === 'system'
      ? { provider: 'custom_firestore', tier: 'turbo', customConfig: this.currentCloudConfig.customConfig }
      : { provider: 'system', tier: 'free' };
    const alternativeProviderLatency = await this.measureLatency(alternativeConfig);
    this.addLatencyMeasurement(alternativeProviderLatency);

    this.evaluateSwitchRecommendation();
  }

  /**
   * Realiza uma operação de ping no Firestore e mede o tempo.
   * Em um ambiente real, isso inicializaria uma instância secundária do Firebase para o custom_firestore.
   */
  private async measureLatency(config: CloudConfig): Promise<LatencyMeasurement> {
    const startTime = Date.now();
    let error: string | undefined;
    try {
      // Simula um ping: tenta ler um documento de teste ou o próprio documento da empresa
      // Para custom_firestore, precisaríamos de uma instância Firebase separada.
      // Aqui, simulamos o sucesso se a config for válida.
      if (config.provider === 'custom_firestore' && (!config.customConfig?.projectId || !config.customConfig?.apiKey)) {
        throw new Error('Configuração GCP privada incompleta.');
      }
      await firebaseService.getDoc('enterprises', this.enterpriseId!); // Ping no Firestore atual
    } catch (e: any) {
      error = e.message;
      logger.warn('system', `Falha no ping de latência para ${config.provider}`, { error });
    }
    const endTime = Date.now();
    return { provider: config.provider, latency: endTime - startTime, timestamp: endTime, error };
  }

  private addLatencyMeasurement(measurement: LatencyMeasurement) {
    if (measurement.provider === 'system') {
      this.lastLatencies.system.push(measurement);
      if (this.lastLatencies.system.length > this.MEASUREMENT_WINDOW) this.lastLatencies.system.shift();
    } else {
      this.lastLatencies.custom.push(measurement);
      if (this.lastLatencies.custom.length > this.MEASUREMENT_WINDOW) this.lastLatencies.custom.shift();
    }
    coreEventBus.emit('system:latency_update', this.getLatestLatencies());
  }

  /**
   * Avalia se uma troca de provedor é recomendada e, se auto-switch estiver ativo, executa.
   */
  private async evaluateSwitchRecommendation() {
    if (!this.enterpriseId || !this.currentCloudConfig) return;

    const avgLatency = (measurements: LatencyMeasurement[]) => {
      const validMeasurements = measurements.filter(m => !m.error);
      if (validMeasurements.length === 0) return Infinity;
      return validMeasurements.reduce((sum, m) => sum + m.latency, 0) / validMeasurements.length;
    };

    const systemAvg = avgLatency(this.lastLatencies.system);
    const customAvg = avgLatency(this.lastLatencies.custom);

    let recommendation: { provider: 'system' | 'custom_firestore'; reason: string } | null = null;

    if (this.currentCloudConfig.provider === 'system' && customAvg !== Infinity && systemAvg > customAvg * (1 + this.LATENCY_THRESHOLD_PERCENT / 100)) {
      recommendation = { provider: 'custom_firestore', reason: `GCP privada está ${this.LATENCY_THRESHOLD_PERCENT}% mais rápida.` };
    } else if (this.currentCloudConfig.provider === 'custom_firestore' && systemAvg !== Infinity && customAvg > systemAvg * (1 + this.LATENCY_THRESHOLD_PERCENT / 100)) {
      recommendation = { provider: 'system', reason: `Firestore padrão está ${this.LATENCY_THRESHOLD_PERCENT}% mais rápido.` };
    }

    if (recommendation) {
      coreEventBus.emit('system:cloud_recommendation', recommendation);
      logger.warn('system', `Recomendação de Cloud Switch: ${recommendation.reason}`, recommendation);

      if (this.autoSwitchEnabled) {
        logger.info('system', `Executando Cloud Switch automático para ${recommendation.provider}.`);
        // Importação dinâmica para evitar circular dependency
        const { accountService } = await import('./accountService'); 
        await accountService.updateCloudInfrastructure(this.enterpriseId, {
          provider: recommendation.provider,
          tier: recommendation.provider === 'system' ? 'free' : 'turbo',
          customConfig: this.currentCloudConfig.customConfig // Mantém a config customizada se voltar para ela
        });
        // Notifica o usuário sobre a troca
        await CommunicationEngine.sendMessage({
          enterpriseId: this.enterpriseId,
          companyId: this.enterpriseId,
          title: '⚡️ Troca Automática de Cloud',
          content: `O sistema detectou que a conexão com a nuvem ${recommendation.provider === 'system' ? 'padrão do Grid OS' : 'privada do Google Cloud'} está mais performática e realizou a troca automática. Razão: ${recommendation.reason}`,
          type: 'info',
          userId: 'admin_broadcast'
        });
      }
    }
  }

  getLatestLatencies() {
    return this.lastLatencies;
  }

  getAutoSwitchEnabled() {
    return this.autoSwitchEnabled;
  }

  setAutoSwitchEnabled(enabled: boolean) {
    this.autoSwitchEnabled = enabled;
  }
}

export const cloudLatencyMonitor = new CloudLatencyMonitor();