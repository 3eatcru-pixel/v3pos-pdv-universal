import { firebaseService } from '../../services/firebaseService';
import { generateSafeId } from '../lib/utils';

export type Sector = 'Bar' | 'Kitchen' | 'Service' | 'Stock' | 'Admin';

export interface SectorTask {
  id: string;
  enterpriseId: string;
  title: string;
  sector: Sector;
  completed: boolean;
  assignedDate: string; // yyyy-MM-dd
  updatedAt?: number;
}

export class SectorTaskEngine {
  static async createTask(enterpriseId: string, title: string, sector: Sector) {
    const id = generateSafeId('task');
    const task: SectorTask = {
      id,
      enterpriseId,
      title,
      sector,
      completed: false,
      assignedDate: new Date().toISOString().split('T')[0]
    };
    await firebaseService.saveItem('sector_tasks', id, task);
  }

  /**
   * Altera o estado de conclusão de uma tarefa.
   */
  static async toggleTask(taskId: string, completed: boolean) {
    await firebaseService.updateItem('sector_tasks', taskId, {
      completed,
      updatedAt: Date.now()
    });
  }
}