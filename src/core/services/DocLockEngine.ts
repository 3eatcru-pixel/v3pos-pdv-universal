import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';

export interface DocLock {
  docId: string;
  userId: string;
  userName: string;
  expiresAt: number;
  enterpriseId: string;
}

/**
 * DocLockEngine - Gerenciador de Concorrência
 * Impede que dois usuários editem o mesmo recurso simultaneamente.
 */
export class DocLockEngine {
  private static readonly LOCK_DURATION_MS = 12 * 60 * 1000; // 12 Minutos (Cobre inatividade de 10min)

  /**
   * Tenta adquirir o cadeado de um documento.
   * @returns { success: boolean, holder?: string }
   */
  static async acquireLock(enterpriseId: string, docId: string, userId: string, userName: string): Promise<{ success: boolean; holder?: string }> {
    try {
      const lockId = `lock_${docId}`;
      const ref = firebaseService.getDocRef('system_locks', lockId);
      
      return await firebaseService.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const now = Date.now();

        if (snap.exists()) {
          const lock = snap.data() as DocLock;
          // Se o cadeado ainda é válido e pertence a outra pessoa
          if (lock.expiresAt > now && lock.userId !== userId) {
            return { success: false, holder: lock.userName };
          }
        }

        // Cria ou renova o cadeado
        const newLock: DocLock = {
          docId,
          userId,
          userName,
          enterpriseId,
          expiresAt: now + this.LOCK_DURATION_MS
        };

        tx.set(ref, newLock);
        return { success: true };
      });
    } catch (error) {
      logger.error('system', 'Falha ao processar trava de documento', { docId, error });
      return { success: false };
    }
  }

  /**
   * Libera o cadeado manualmente (ex: ao clicar em Salvar ou Cancelar)
   */
  static async releaseLock(docId: string, userId: string) {
    const lockId = `lock_${docId}`;
    const lock = await firebaseService.getDoc('system_locks', lockId) as DocLock;
    
    if (lock && lock.userId === userId) {
      await firebaseService.deleteItem('system_locks', lockId);
      logger.debug('system', `Cadeado liberado: ${docId}`);
    }
  }

  /**
   * Verifica se pode sobrescrever um arquivo bloqueado (Apenas Owners/Devs)
   */
  static async forceOverwrite(enterpriseId: string, docId: string, userId: string, userName: string) {
    const lockId = `lock_${docId}`;
    await firebaseService.saveItem('system_locks', lockId, {
      docId,
      userId,
      userName: `${userName} (Sobrescrita Admin)`,
      enterpriseId,
      expiresAt: Date.now() + this.LOCK_DURATION_MS
    });
  }
}