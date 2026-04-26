import { firebaseService } from '../../services/firebaseService';
import { generateSafeId } from '../lib/utils';

export interface LostItem {
  id: string;
  enterpriseId: string;
  description: string;
  photo?: string;
  tableReference?: string;
  foundAt: number;
  status: 'stored' | 'returned' | 'disposed';
  staffName: string;
}

export class LostAndFoundEngine {
  static async registerItem(enterpriseId: string, data: Omit<LostItem, 'id' | 'status' | 'foundAt'>) {
    const id = generateSafeId('lost');
    const item: LostItem = {
      ...data,
      id,
      enterpriseId,
      status: 'stored',
      foundAt: Date.now()
    };
    await firebaseService.saveItem('lost_and_found', id, item);
    return id;
  }
}