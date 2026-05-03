import { firebaseService } from './firebaseService';
import { dbLocal } from './db';
import { logger } from '../core/services/logger';

interface SyncTask {
  id: string;
  collection: string;
  action: 'save' | 'update' | 'delete';
  payload: any;
  timestamp: number;
}

class BackgroundSyncManager {
  private isSyncing = false;

  /**
   * Enfileira uma tarefa para ser sincronizada quando houver internet.
   */
  public async enqueue(collection: string, id: string, action: 'save' | 'update' | 'delete', payload: any) {
    const task: SyncTask = { id, collection, action, payload, timestamp: Date.now() };
    await dbLocal.addToLedger(task);
    
    logger.debug('sync', `Tarefa enfileirada offline: ${action} em ${collection}`, { id });
    
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  public async processQueue() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;

    try {
      const db = await dbLocal.getDb();
      const allTasks = await db.getAll('ledger');
      
      // Filter for unsynced and sort by timestamp
      const pendingTasks = allTasks
        .filter((t: any) => !t.synced)
        .sort((a: any, b: any) => a.timestamp - b.timestamp);

      for (const task of pendingTasks) {
        try {
          if (task.action === 'save' || task.action === 'update') {
            await firebaseService.saveItem(task.collection, task.id, task.payload);
          } else if (task.action === 'delete') {
            await firebaseService.deleteItem(task.collection, task.id);
          }
          // Mark as synced locally
          await db.put('ledger', { ...task, synced: true });
        } catch (err) {
          logger.error('sync', 'Falha ao processar tarefa da fila', { taskId: task.id, err });
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }
}

export const backgroundSyncManager = new BackgroundSyncManager();