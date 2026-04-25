import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';

export interface FeatureFlags {
  staffFood: boolean;
  automaticTips: boolean;
  trainingMode: boolean;
  advancedP2PSync: boolean;
  multiCurrency: boolean;
  wastageOnCheckout: boolean;
}

/**
 * FeatureFlagEngine - Gerenciador de Recursos Opcionais
 * Controla o que está visível na UI sem quebrar os motores core.
 */
export class FeatureFlagEngine {
  private static DEFAULT_FLAGS: FeatureFlags = {
    staffFood: false,
    automaticTips: true,
    trainingMode: false,
    advancedP2PSync: true,
    multiCurrency: false,
    wastageOnCheckout: false
  };

  /**
   * Busca as flags de customização de uma unidade.
   */
  static async getFlags(enterpriseId: string, shopId: string): Promise<FeatureFlags> {
    try {
      const docId = `features_${shopId}`;
      const config = await firebaseService.getDoc('unit_features', docId) as any;
      
      return {
        ...this.DEFAULT_FLAGS,
        ...(config?.flags || {})
      };
    } catch (error) {
      return this.DEFAULT_FLAGS;
    }
  }

  /**
   * Salva alterações nas chaves de recurso.
   */
  static async updateFlags(enterpriseId: string, shopId: string, flags: Partial<FeatureFlags>) {
    const docId = `features_${shopId}`;
    await firebaseService.saveItem('unit_features', docId, {
      enterpriseId,
      shopId,
      flags,
      updatedAt: Date.now()
    });
    logger.info('settings', 'Recursos opcionais atualizados', { shopId, flags });
  }
}