import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { generateSafeId } from '../lib/utils';
import { Shift, Staff } from '../../types';
import { CommissionEngine } from './CommissionEngine';

export interface FreelancerPayout {
  id: string;
  enterpriseId: string;
  staffId: string;
  shiftId: string;
  baseRate: number; // Valor acordado por dia/hora
  commissionAmount: number;
  totalAmount: number;
  status: 'calculated' | 'authorized' | 'paid';
  authorizedBy?: string;
  paidAt?: number;
  createdAt: number;
}

/**
 * DailyPayoutEngine - Motor de Pagamento Diário para Freelancers
 * Calcula e autoriza remunerações ao final de cada turno.
 */
export class DailyPayoutEngine {
  /**
   * Calcula o valor total devido por um turno específico.
   */
  static async calculateShiftPayout(enterpriseId: string, shift: Shift): Promise<FreelancerPayout> {
    try {
      const staff = await firebaseService.getDoc('staff', shift.staffId) as Staff;
      if (!staff || staff.businessModel !== 'freelancer') {
        throw new Error('O colaborador não é um freelancer elegível para diária.');
      }

      // 1. Obtém a taxa base (diária) do cadastro do freelancer
      const baseRate = (staff as any).dailyRate || 0;

      // 2. Calcula comissões geradas especificamente neste turno
      // Usamos o CommissionEngine mas filtrando pelo timestamp do shift
      const start = shift.startTime;
      const end = shift.endTime || Date.now();
      
      const orders = await firebaseService.getDocsByQuery('orders', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'staffId', op: '==', value: shift.staffId },
        { field: 'closedAt', op: '>=', value: start },
        { field: 'closedAt', op: '<=', value: end }
      ]);

      // Simplificação do cálculo de comissão para o turno
      const commission = (orders as any[]).reduce((acc, order) => acc + (order.total * 0.05), 0); // Ex: 5% fixo para free

      const payout: FreelancerPayout = {
        id: generateSafeId('pay'),
        enterpriseId,
        staffId: shift.staffId,
        shiftId: shift.id,
        baseRate,
        commissionAmount: commission,
        totalAmount: baseRate + commission,
        status: 'calculated',
        createdAt: Date.now()
      };

      await firebaseService.saveItem('freelancer_payouts', payout.id, payout);
      logger.info('finance', 'Cálculo de diária gerado', { staffId: shift.staffId, total: payout.totalAmount });
      return payout;
    } catch (error) {
      logger.error('finance', 'Erro ao calcular diária', { error });
      throw error;
    }
  }

  /**
   * Autoriza o pagamento e registra no livro financeiro (Ledger).
   */
  static async authorizePayout(payoutId: string, adminName: string) {
    try {
      await firebaseService.runTransaction(async (tx) => {
        const ref = firebaseService.getDocRef('freelancer_payouts', payoutId);
        const snap = await tx.get(ref);
        const data = snap.data() as FreelancerPayout;

        tx.update(ref, {
          status: 'authorized',
          authorizedBy: adminName,
          updatedAt: Date.now()
        });

        // Registra a saída no financeiro global
        const transactionId = generateSafeId('trans');
        tx.set(firebaseService.getDocRef('transactions', transactionId), {
          id: transactionId,
          enterpriseId: data.enterpriseId,
          type: 'expense',
          category: 'Freelancers',
          amount: data.totalAmount,
          description: `Diária Freelancer: ${payoutId}`,
          timestamp: Date.now()
        });
      });
    } catch (error) {
      logger.error('finance', 'Falha na autorização de diária', { error });
    }
  }
}