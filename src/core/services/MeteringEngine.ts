import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';

export type CloudOperation = 'SALE' | 'SYNC' | 'BACKUP' | 'RESTORE' | 'STAFF_CHANGE';

const UNIT_WEIGHTS: Record<CloudOperation, number> = {
  'SALE': 2,         // Venda processada
  'SYNC': 10,        // Ciclo de sincronismo completo
  'BACKUP': 50,      // Exportação para Drive
  'RESTORE': 100,    // Restauração de Snapshot
  'STAFF_CHANGE': 1  // Edição de colaborador
};

/**
 * MeteringEngine - Motor de Controle de Consumo Cloud
 * Gerencia as "Units" mensais do Firestore padrão (Limite: 400).
 */
export class MeteringEngine {
  /**
   * Registra o consumo de unidades e verifica se a empresa ainda tem saldo.
   */
  static async trackUsage(enterpriseId: string, operation: CloudOperation, cloudConfig: any, existingTx?: any): Promise<boolean> {
    // Se estiver no Modo Turbo (GCP Própria), o consumo é ilimitado
    if (cloudConfig?.provider === 'custom_firestore' || cloudConfig?.tier === 'turbo') {
      return true;
    }

    const weight = UNIT_WEIGHTS[operation] || 1;

    const performTracking = async (tx: any) => {
      const ref = firebaseService.getDocRef('enterprises', enterpriseId);
      const snap = await tx.get(ref);
      
      if (snap.exists()) {
        const data = snap.data();
        const currentUsage = Number(data.monthlyUnitsUsed) || 0;
        const limit = Number(data.monthlyUnitsLimit) || 400;

        if (currentUsage + weight > limit) {
          logger.warn('system', 'Limite de unidades cloud atingido.', { enterpriseId, operation });
          return false;
        } else {
          tx.update(ref, { 
            monthlyUnitsUsed: currentUsage + weight,
            lastUsageAt: Date.now()
          });
          return true;
        }
      }
      return true;
    };

    try {
      if (existingTx) {
        return await performTracking(existingTx);
      } else {
        return await firebaseService.runTransaction(performTracking);
      }
    } catch (error) {
      logger.error('system', 'Falha ao contabilizar uso de cloud units', { error });
      return true;
    }
  }
}