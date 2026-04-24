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
      transactions: []
    };

    await firebaseService.saveItem('cashier_sessions', sessionId, session);
    logger.info('finance', 'Caixa aberto', { sessionId, balance });
    return session;
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
    const sessions = await firebaseService.getAllDocs('cashier_sessions');
    return sessions.find(s => s.shopId === shopId && s.userId === userId && s.status === 'open') || null;
  }
}

export const cashierEngine = new CashierEngine();