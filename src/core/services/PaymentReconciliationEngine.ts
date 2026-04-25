import { logger } from './logger';
import { firebaseService } from '../../services/firebaseService';

export interface PaymentTransaction {
  id: string;
  saleId: string;
  amount: number;
  shopId: string; // Adicionado shopId para permitir conciliação por loja
  method: 'card' | 'cash' | 'pix' | 'other';
  provider?: string; // ex: 'Stone', 'PagSeguro', 'MercadoPago'
  externalId?: string; // NSU ou ID da transação na maquininha/API
  terminalId?: string; // ID do terminal físico
  status: 'confirmed' | 'pending_reconciliation' | 'discrepancy';
  timestamp: number;
}

class PaymentReconciliationEngine {
  /** 
   * Registra uma tentativa de pagamento vinculando metadados da 'máquina'
   */
  async registerPayment(data: Omit<PaymentTransaction, 'status' | 'timestamp'>) {
    const transaction: PaymentTransaction = {
      ...data,
      status: data.method === 'cash' ? 'confirmed' : 'pending_reconciliation',
      timestamp: Date.now()
    };

    logger.info('payment', 'Registrando pagamento para conciliação', { 
      method: data.method, 
      externalId: data.externalId 
    });

    await firebaseService.saveItem('payment_ledger', transaction.id, transaction);
    return transaction;
  }

  /**
   * Realiza a Reconciliação (Match) entre o software e o relatório da adquirente
   */
  async reconcileWithProviderReport(externalReport: any[]) {
    const ledger = await firebaseService.getAllDocs('payment_ledger');
    
    // Otimização: Criar um mapa para busca O(1) em vez de O(n) dentro do loop
    const ledgerMap = new Map(ledger.map(l => [l.externalId, l]));
    
    const results = { matched: 0, missing: 0, totalAmount: 0 };
    const updatePromises: Promise<void>[] = [];

    for (const entry of externalReport) {
      // Procura no nosso banco por NSU ou ID Externo
      const localMatch = ledgerMap.get(entry.nsu) || ledgerMap.get(entry.id);
      
      if (localMatch) {
        updatePromises.push(firebaseService.updateItem('payment_ledger', localMatch.id, { 
          status: 'confirmed',
          reconciledAt: Date.now() 
        }));
        results.matched++;
        results.totalAmount += localMatch.amount;
      } else {
        results.missing++;
        logger.warn('payment', 'Transação encontrada na máquina mas não no sistema', { externalId: entry.nsu });
      }
    }

    await Promise.all(updatePromises);
    return results;
  }

  /**
   * Gera resumo de fechamento de caixa (X Report)
   */
  async getCashierSummary(shopId: string) {
    const logs = (await firebaseService.getAllDocs('payment_ledger')).filter(l => l.shopId === shopId); // Filtra por shopId
    return {
      totalPix: logs.filter(l => l.method === 'pix').reduce((a, b) => a + b.amount, 0),
      totalCard: logs.filter(l => l.method === 'card').reduce((a, b) => a + b.amount, 0),
      totalCash: logs.filter(l => l.method === 'cash').reduce((a, b) => a + b.amount, 0),
      pendingCount: logs.filter(l => l.status === 'pending_reconciliation').length
    };
  }
}

export const paymentReconciliationEngine = new PaymentReconciliationEngine();