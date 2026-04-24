import { firebaseService } from '../../services/firebaseService';
import type { Shift } from '../../types';

interface SaveShiftParams {
  editingShift: Shift | null;
  selectedShopId: string | null;
  enterpriseId?: string | null;
  staffId: string;
  area: string;
  startTime: number;
  endTime: number;
  module?: 'restaurant' | 'market' | 'construction' | 'retail' | 'service' | string;
  status?: 'planned' | 'confirmed' | 'missing' | 'completed';
}

export class ShiftEngine {
  static async saveShift(params: SaveShiftParams): Promise<Shift> {
    const shiftId = params.editingShift?.id || `shift-${Date.now()}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
    const resolvedShopId = params.selectedShopId || params.editingShift?.shopId;
    if (!resolvedShopId) {
      throw new Error('shop_context_missing');
    }
    const shiftData: Shift = {
      id: shiftId,
      shopId: resolvedShopId,
      enterpriseId: params.enterpriseId || params.editingShift?.enterpriseId,
      staffId: params.staffId,
      area: params.area,
      startTime: params.startTime,
      endTime: params.endTime,
      module: params.module || params.editingShift?.module,
      status: params.status || params.editingShift?.status || 'planned',
    };

    await firebaseService.saveItem('shifts', shiftId, shiftData);
    return shiftData;
  }

  static async deleteShift(shiftId: string): Promise<void> {
    await firebaseService.deleteItem('shifts', shiftId);
  }
}

