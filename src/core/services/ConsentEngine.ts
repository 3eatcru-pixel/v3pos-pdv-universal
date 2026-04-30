import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';

export interface ConsentRecord {
  id: string;
  entityId: string; // ID do Cliente ou Staff
  type: 'terms_of_use' | 'privacy_policy' | 'marketing';
  version: string;
  acceptedAt: number;
  ipAddress?: string;
  userAgent: string;
}

export class ConsentEngine {
  /**
   * Registra o consentimento de um usuário para uma versão específica dos termos.
   */
  static async recordConsent(entityId: string, type: ConsentRecord['type'], version: string): Promise<void> {
    const id = `consent_${entityId}_${type}_${Date.now()}`;
    const record: ConsentRecord = {
      id,
      entityId,
      type,
      version,
      acceptedAt: Date.now(),
      userAgent: navigator.userAgent
    };

    try {
      await firebaseService.saveItem('privacy_consents', id, record);
      logger.info('privacy', 'Consentimento registrado', { entityId, type, version });
    } catch (error) {
      logger.error('privacy', 'Falha ao registrar consentimento', { error });
      throw error;
    }
  }
}