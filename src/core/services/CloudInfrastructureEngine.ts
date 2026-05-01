import { authService } from '../../auth/authService';
import { logger } from './logger';
import { meshNetwork } from '../../services/p2pSync';

export interface CloudConfig {
  provider: 'system' | 'custom_firestore';
  tier: 'free' | 'turbo';
  customConfig?: { projectId: string; apiKey: string };
  autoSwitchEnabled?: boolean;
}

export class CloudInfrastructureEngine {
  static async updateInfrastructure(companyId: string, config: CloudConfig) {
    await authService.updateTenant(companyId, { 
      cloudConfig: config,
      monthlyUnitsLimit: config.provider === 'system' ? 400 : 999999,
      autoCloudSwitchingEnabled: config.autoSwitchEnabled ?? false
    });
    
    logger.info('system', 'Configuração de infraestrutura de nuvem atualizada', { provider: config.provider });
    
    // Reinicia o motor P2P com as novas credenciais se necessário
    meshNetwork.stopCloudSync();
    meshNetwork.startCloudSync(companyId, config, config.autoSwitchEnabled);
  }

  static async revertToDefault(companyId: string) {
    await authService.updateTenant(companyId, { 
      cloudConfig: { provider: 'system', tier: 'free' },
      monthlyUnitsLimit: 400
    });
    
    logger.error('system', 'REVERT_TO_DEFAULT_CLOUD: Infraestrutura restaurada para o padrão.');
    meshNetwork.stopCloudSync();
    meshNetwork.startCloudSync(companyId);
  }

  static getCloudConfig(tenant: any): CloudConfig {
    return tenant?.cloudConfig || { provider: 'system', tier: 'free' };
  }
}