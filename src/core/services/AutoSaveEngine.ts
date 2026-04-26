import { DocLockEngine } from './DocLockEngine';
import { BackupEngine } from './BackupEngine';
import { logger } from './logger';

/**
 * AutoSaveEngine - Sistema de Salvamento Automático e Gestão de Inatividade.
 * Garante que rascunhos sejam salvos no Drive e travas sejam liberadas após 10 minutos.
 */
export class AutoSaveEngine {
  private static sessions: Record<string, {
    saveInterval: any;
    inactivityTimeout: any;
    lastActivity: number;
    cleanupListeners: () => void;
  }> = {};

  private static readonly INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 Minutos
  private static readonly AUTO_SAVE_INTERVAL = 2 * 60 * 1000; // 2 Minutos
  private static readonly HEARTBEAT_THROTTLE = 30 * 1000; // 30 Segundos

  private static lastHeartbeat: Record<string, number> = {};

  /**
   * Inicia uma sessão de monitoramento para um documento sendo editado.
   */
  static startMonitoring(
    enterpriseId: string,
    docId: string,
    userId: string,
    userName: string,
    getData: () => any,
    onAutoRelease: () => void
  ) {
    this.stopMonitoring(docId);

    const handleActivity = () => {
      const now = Date.now();
      if (this.sessions[docId]) {
        this.sessions[docId].lastActivity = now;
        
        // Heartbeat: Renova o lock no banco apenas a cada 30 segundos de atividade
        if (now - (this.lastHeartbeat[docId] || 0) > this.HEARTBEAT_THROTTLE) {
          DocLockEngine.acquireLock(enterpriseId, docId, userId, userName);
          this.lastHeartbeat[docId] = now;
        }
        
        clearTimeout(this.sessions[docId].inactivityTimeout);
        this.sessions[docId].inactivityTimeout = setTimeout(() => {
          this.releaseSession(enterpriseId, docId, userId, getData, onAutoRelease);
        }, this.INACTIVITY_LIMIT);
      }
    };

    // Listeners globais de atividade para detecção de presença nativa
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousedown', handleActivity);

    this.sessions[docId] = {
      lastActivity: Date.now(),
      saveInterval: setInterval(() => {
        BackupEngine.saveDocumentDraft(enterpriseId, docId, getData());
      }, this.AUTO_SAVE_INTERVAL),
      inactivityTimeout: null,
      cleanupListeners: () => {
        window.removeEventListener('mousemove', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('mousedown', handleActivity);
      }
    };

    handleActivity();
  }

  private static async releaseSession(enterpriseId: string, docId: string, userId: string, getData: () => any, callback: () => void) {
    logger.info('system', `⏰ Inatividade prolongada no doc: ${docId}. Liberando e salvando rascunho.`);
    await BackupEngine.saveDocumentDraft(enterpriseId, docId, getData());
    await DocLockEngine.releaseLock(docId, userId);
    this.stopMonitoring(docId);
    callback();
  }

  static stopMonitoring(docId: string) {
    if (this.sessions[docId]) {
      clearInterval(this.sessions[docId].saveInterval);
      clearTimeout(this.sessions[docId].inactivityTimeout);
      this.sessions[docId].cleanupListeners();
      delete this.sessions[docId];
      delete this.lastHeartbeat[docId];
    }
  }
}