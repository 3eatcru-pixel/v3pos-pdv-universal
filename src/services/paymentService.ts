import { firebaseService } from './firebaseService';
import { Transaction, Order } from '../types';
import { accountService } from '../core/services/accountService';
import { logger } from '../core/services/logger';

export interface PaymentRequest {
  orderId?: string;
  amount: number;
  method: 'cash' | 'card' | 'pix' | 'other';
  module: 'restaurant' | 'market' | 'retail' | 'construction' | 'service';
  shopId?: string;
  change?: number;
  tableNumber?: string | number;
  openedBy?: string;
}

class PaymentService {
  /**
   * Process a payment and save it to the transaction history.
   * Also triggers the cash register if it's a cash payment.
   */
  public async processPayment(req: PaymentRequest): Promise<Transaction> {
    const user = accountService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado para processar pagamento.');

    const transactionId = `trx-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const tableInfo = req.tableNumber ? ` | Mesa: ${req.tableNumber}` : '';
    const openedInfo = req.openedBy ? ` | Aberto por: ${req.openedBy}` : '';

    const transaction: Transaction = {
      id: transactionId,
      enterpriseId: user.companyId,
      shopId: req.shopId,
      amount: req.amount,
      type: 'income',
      category: 'sale',
      description: `Venda ${req.module}${tableInfo}${openedInfo}`,
      timestamp: Date.now(),
      status: 'completed',
      paymentMethod: req.method,
      referenceId: req.orderId,
      module: req.module,
      staffId: user.id,
      staffName: user.name,
      change: req.change
    };

    // 1. Save to Firestore
    await firebaseService.saveItem('transactions', transactionId, transaction);

    // 2. Trigger Cash Register if Cash
    if (req.method === 'cash') {
      this.triggerCashRegister(transaction);
    }

    // 3. Logger
    logger.log('system', `Pagamento processado: ${transactionId} (${req.method}) por ${user.name}`);

    return transaction;
  }

  /**
   * Simulates opening the physical cash register.
   * In a real environment, this would call a driver or local hardware bridge.
   */
  private triggerCashRegister(trx: Transaction) {
    console.log('--- ABRINDO GAVETA DE DINHEIRO ---');
    console.log(`Valor: ${trx.amount} | Troco: ${trx.change || 0}`);
    
    // Dispatch a custom event for the UI to show a "Register Opened" notification if needed
    const event = new CustomEvent('cash-register-open', { 
      detail: { 
        trxId: trx.id, 
        amount: trx.amount, 
        change: trx.change 
      } 
    });
    window.dispatchEvent(event);
  }

  /**
   * Triggers a request to open the Payment Modal UI.
   * This decoupled approach allows any module to use the standardized Payment Modal.
   */
  public requestPaymentUI(options: {
    total: number;
    title: string;
    itemsSummary?: string;
    orderId: string;
    module: 'restaurant' | 'market' | 'retail' | 'construction' | 'service';
    onSuccess?: (payments: {method: 'cash'|'card'|'pix', amount: number, change?: number}[]) => Promise<void>;
  }) {
    const event = new CustomEvent('request-payment-ui', { detail: options });
    window.dispatchEvent(event);
  }

  /**
   * Helper to fetch transaction history for a company/shop.
   */
  public subscribeToTransactions(enterpriseId: string, shopId: string | null, callback: (trxs: Transaction[]) => void) {
    return firebaseService.subscribeCollection('transactions', enterpriseId, shopId, (data) => {
      callback(data as Transaction[]);
    });
  }
}

export const paymentService = new PaymentService();
