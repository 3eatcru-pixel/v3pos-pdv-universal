import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { generateSafeId } from '../lib/utils';

export interface BookingDeposit {
  id: string;
  enterpriseId: string;
  customerName: string;
  serviceDate: number;
  depositAmount: number;
  totalServicePrice: number;
  status: 'pending' | 'confirmed' | 'used' | 'refunded';
  paymentMethod: string;
  staffId: string; // Profissional que agendou
  createdAt: number;
}

/**
 * BookingDepositEngine - Motor de Gestão de Sinais e Reservas
 * Garante a integridade financeira de pagamentos antecipados para serviços.
 */
export class BookingDepositEngine {
  /**
   * Registra o pagamento de um sinal (sinal/booking fee).
   */
  static async registerDeposit(params: Omit<BookingDeposit, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const depositId = generateSafeId('dep');
    
    const deposit: BookingDeposit = {
      ...params,
      id: depositId,
      status: 'confirmed',
      createdAt: Date.now()
    };

    try {
      await firebaseService.runTransaction(async (tx) => {
        // 1. Salva o registro do sinal
        tx.set(firebaseService.getDocRef('booking_deposits', depositId), deposit);

        // 2. Registra no Payment Ledger para conciliação bancária imediata
        const ledgerId = generateSafeId('pay');
        tx.set(firebaseService.getDocRef('payment_ledger', ledgerId), {
          id: ledgerId,
          saleId: depositId, // Vincula ao ID do depósito
          enterpriseId: params.enterpriseId,
          amount: params.depositAmount,
          method: params.paymentMethod,
          status: 'confirmed',
          type: 'booking_deposit',
          timestamp: Date.now()
        });
      });

      logger.info('finance', 'Sinal de agendamento registrado com sucesso', { depositId, amount: params.depositAmount });
      return depositId;
    } catch (error) {
      logger.error('finance', 'Falha ao processar sinal de agendamento', { error });
      throw error;
    }
  }

  /**
   * Busca sinais confirmados para um cliente específico por nome.
   */
  static async findPendingDeposits(enterpriseId: string, customerName: string): Promise<BookingDeposit[]> {
    try {
      const data = await firebaseService.getDocsByQuery('booking_deposits', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'customerName', op: '==', value: customerName },
        { field: 'status', op: '==', value: 'confirmed' }
      ]);
      return data as BookingDeposit[];
    } catch (error) {
      logger.error('finance', 'Falha ao buscar sinais pendentes', { customerName, error });
      return [];
    }
  }

  /**
   * Calcula o saldo restante a ser pago no dia do serviço.
   */
  static async getRemainingBalance(depositId: string): Promise<number> {
    const deposit = await firebaseService.getDoc('booking_deposits', depositId) as BookingDeposit;
    if (!deposit || deposit.status !== 'confirmed') return 0;
    return Math.max(0, deposit.totalServicePrice - deposit.depositAmount);
  }

  /**
   * Consome o sinal ao finalizar a venda no PDV.
   */
  static async consumeDeposit(tx: any, depositId: string, orderId: string) {
    const ref = firebaseService.getDocRef('booking_deposits', depositId);
    const snap = await tx.get(ref);
    
    if (!snap.exists()) throw new Error('Sinal não localizado');
    const data = snap.data() as BookingDeposit;
    
    if (data.status === 'used') throw new Error('Este sinal já foi utilizado');

    tx.update(ref, { 
      status: 'used',
      usedInOrderId: orderId,
      updatedAt: Date.now() 
    });
    
    logger.info('finance', 'Sinal consumido na venda final', { depositId, orderId });
  }
}