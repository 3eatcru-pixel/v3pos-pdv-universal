import { logger } from './logger';
import { firebaseService } from '../../services/firebaseService';

export interface CashierSession {
  id: string;
  shopId: string;
  userId: string;
  userName: string;
  openingTime: number;
  closingTime?: number;
  openingBalance: number;
  closingBalance?: number;
  expectedBalance?: number;
  status: 'open' | 'closed';
  transactions: any[];
  totalSales?: number;
}

class CashierEngine {
  /**
   * Abre o caixa para o turno atual
   */
  async openCashier(shopId: string, userId: string, userName: string, balance: number) {
    const sessionId = `session_${Date.now()}`;
    const session: CashierSession = {
      id: sessionId,
      shopId,
      userId,
      userName,
      openingTime: Date.now(),
      openingBalance: balance,
      status: 'open',
      transactions: [],
      totalSales: 0
    };

    await firebaseService.saveItem('cashier_sessions', sessionId, session);
    logger.info('finance', 'Caixa aberto', { sessionId, balance });
    return session;
  }

  /**
   * Registra uma venda na sessão de caixa ativa
   */
  async addTransactionToSession(sessionId: string, amount: number, transactionId: string) {
    const session = await firebaseService.getDoc('cashier_sessions', sessionId) as CashierSession;
    if (!session) return;

    const updatedTransactions = [...(session.transactions || []), {
      id: transactionId,
      amount,
      timestamp: Date.now()
    }];

    await firebaseService.updateItem('cashier_sessions', sessionId, {
      transactions: updatedTransactions,
      totalSales: (session.totalSales || 0) + amount,
      expectedBalance: (session.openingBalance || 0) + (session.totalSales || 0) + amount
    });
  }

  /**
   * Fecha o caixa e calcula divergências
   */
  async closeCashier(sessionId: string, finalBalance: number) {
    const session = await firebaseService.getDoc('cashier_sessions', sessionId) as CashierSession;
    if (!session) throw new Error('Sessão não encontrada');

    const closingData = {
      closingTime: Date.now(),
      closingBalance: finalBalance,
      status: 'closed' as const
    };

    await firebaseService.updateItem('cashier_sessions', sessionId, closingData);
    logger.info('finance', 'Caixa fechado', { sessionId, finalBalance });
    return { ...session, ...closingData };
  }

  /**
   * Verifica se existe um caixa aberto para a unidade
   */
  async getActiveSession(shopId: string, userId: string): Promise<CashierSession | null> {
    const sessions = await firebaseService.getDocsByQuery('cashier_sessions', [
      { field: 'shopId', op: '==', value: shopId },
      { field: 'userId', op: '==', value: userId },
      { field: 'status', op: '==', value: 'open' }
    ]) as CashierSession[];
    return sessions[0] || null;
  }
}

export const cashierEngine = new CashierEngine();