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
    await dbLocal.table('sync_queue').add(task);
    
    logger.debug('sync', `Tarefa enfileirada offline: ${action} em ${collection}`, { id });
    
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  public async processQueue() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;

    try {
      const tasks = await dbLocal.table('sync_queue').orderBy('timestamp').toArray();
      for (const task of tasks) {
        try {
          if (task.action === 'save' || task.action === 'update') {
            await firebaseService.saveItem(task.collection, task.id, task.payload);
          } else if (task.action === 'delete') {
            await firebaseService.deleteItem(task.collection, task.id);
          }
          await dbLocal.table('sync_queue').delete(task.id);
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