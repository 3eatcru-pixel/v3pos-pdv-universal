import { firebaseService } from '../../services/firebaseService';
import type { Shift } from '../../types';

interface SaveShiftParams {
  editingShift: Shift | null;
  selectedShopId: string | null;
  staffId: string;
  area: 'FOH' | 'BOH';
  startTime: number;
  endTime: number;
}

export class ShiftEngine {
  static async saveShift(params: SaveShiftParams): Promise<Shift> {
    const shiftId = params.editingShift?.id || `shift-${Date.now()}`;
    const shiftData: Shift = {
      id: shiftId,
      shopId: params.selectedShopId || params.editingShift?.shopId || 'shop-1',
      staffId: params.staffId,
      area: params.area,
      startTime: params.startTime,
      endTime: params.endTime,
    };

    await firebaseService.saveItem('shifts', shiftId, shiftData);
    return shiftData;
  }

  static async deleteShift(shiftId: string): Promise<void> {
    await firebaseService.deleteItem('shifts', shiftId);
  }
}

