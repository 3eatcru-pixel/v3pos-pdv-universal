import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { idGenerator } from '../utils/idGenerator';
import type { Shift } from '../../types';

interface SaveShiftParams {
  editingShift: Shift | null;
  selectedShopId: string | null;
  enterpriseId?: string | null;
  staffId: string;
  area: string;
  startTime: number;
  endTime: number;
  module?: 'restaurant' | 'market' | 'construction' | 'retail' | 'service' | 'pharmacy' | 'autoparts' | string;
  status?: 'planned' | 'confirmed' | 'missing' | 'completed';
  businessModel?: 'commission' | 'rental' | 'hybrid' | 'freelancer';
}

export class ShiftEngine {
  /**
   * Valida integridade da escala: evita sobreposição de horários para o mesmo colaborador.
   */
  static async validateShiftConflict(enterpriseId: string, staffId: string, start: number, end: number, shiftId?: string): Promise<boolean> {
    // Otimização: Busca apenas shifts do colaborador e dentro de um período relevante
    const shifts = await firebaseService.getDocsByQuery('shifts', [
      { field: 'enterpriseId', op: '==', value: enterpriseId },
      { field: 'staffId', op: '==', value: staffId },
      { field: 'startTime', op: '<', value: end }, // Shifts que começam antes do fim da nova escala
      { field: 'endTime', op: '>', value: start }  // Shifts que terminam depois do início da nova escala
    ]) as Shift[];

    const hasConflict = shifts.some(s => 
      s.id !== shiftId &&
      (start < s.endTime && end > s.startTime) // Lógica correta para sobreposição de intervalos
    );

    return !hasConflict;
  }

  static async saveShift(params: SaveShiftParams): Promise<Shift> {
    const entId = params.enterpriseId || params.editingShift?.enterpriseId;
    if (!entId) throw new Error('enterprise_context_missing');

    const isValid = await this.validateShiftConflict(
      entId,
      params.staffId,
      params.startTime,
      params.endTime,
      params.editingShift?.id
    );

    if (!isValid) {
      logger.warn('hr', 'Tentativa de escala em conflito de horário bloqueada', { staffId: params.staffId });
      throw new Error('shift_conflict_detected');
    }

    const shiftId = params.editingShift?.id || idGenerator.generate('shift');
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
      status: params.status || params.editingShift?.status || (['rental', 'freelancer'].includes(params.businessModel!) ? 'confirmed' : 'planned'),
    };

    await firebaseService.saveItem('shifts', shiftId, shiftData);
    return shiftData;
  }

  static async deleteShift(shiftId: string): Promise<void> {
    await firebaseService.deleteItem('shifts', shiftId);
  }
}
