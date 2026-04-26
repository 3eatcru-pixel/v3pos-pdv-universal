import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { generateSafeId } from '../lib/utils';

export interface Customer {
  id: string;
  enterpriseId: string;
  name: string;
  email?: string;
  phone?: string;
  document?: string; // CPF/CNPJ
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state?: string;
    zipCode?: string;
  };
  registrationMode: 'simple' | 'full'; // 'simple' para conhecidos, 'full' para controle formal (mascates/cesta básica)
  notes?: string; // Campo para referências ou observações do mascate
  creditLimit: number;
  currentDebt: number;
  status: 'active' | 'blocked';
  lastPurchaseAt?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * CustomerEngine - Motor de Gestão de Clientes e Crédito (Fiado)
 * Centraliza o cadastro de clientes e o controle de débitos para pagamento posterior.
 */
export class CustomerEngine {
  /**
   * Salva ou atualiza um cliente no banco central.
   */
  static async saveCustomer(enterpriseId: string, data: Partial<Customer>) {
    const id = data.id || generateSafeId('cust');
    
    try {
      await firebaseService.runTransaction(async (tx) => {
        const ref = firebaseService.getDocRef('customers', id);
        const snap = await tx.get(ref);
        const current = snap.exists() ? snap.data() as Customer : {};

        const customer: Customer = {
          ...current,
          ...data,
          id,
          enterpriseId,
          name: data.name || current.name || 'Consumidor Final',
          registrationMode: data.registrationMode || current.registrationMode || 'simple',
          address: data.address || current.address,
          notes: data.notes || current.notes,
          document: data.document || current.document,
          phone: data.phone || current.phone,
          creditLimit: data.creditLimit ?? current.creditLimit ?? 0,
          currentDebt: data.currentDebt ?? current.currentDebt ?? 0,
          status: data.status || current.status || 'active',
          createdAt: current.createdAt || Date.now(),
          updatedAt: Date.now()
        };

        tx.set(ref, customer);
      });

      logger.info('core', 'Perfil de cliente atualizado', { id });
      return id;
    } catch (error) {
      logger.error('core', 'Falha ao salvar cliente', { error });
      throw error;
    }
  }

  /**
   * Registra uma dívida (Venda no Fiado) para o cliente dentro de uma transação.
   */
  static async recordDebt(customerId: string, amount: number, tx: any, existingSnap?: any) {
    const snap = existingSnap || await tx.get(firebaseService.getDocRef('customers', customerId));
    
    if (!snap.exists()) throw new Error('customer_not_found');
    
    const data = snap.data() as Customer;
    if (data.status === 'blocked') throw new Error('customer_blocked');

    const newDebt = (data.currentDebt || 0) + amount;
    
    if (data.creditLimit > 0 && newDebt > data.creditLimit) {
      throw new Error(`credit_limit_exceeded: Limite disponível insuficiente.`);
    }

    tx.update(firebaseService.getDocRef('customers', customerId), { 
      currentDebt: newDebt,
      lastPurchaseAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  /**
   * Realiza a baixa (pagamento) de uma dívida.
   */
  static async settleDebt(enterpriseId: string, shopId: string, customerId: string, amount: number, paymentMethod: string = 'cash') {
    const ref = firebaseService.getDocRef('customers', customerId);
    const transId = generateSafeId('debt-pay');

    await firebaseService.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('customer_not_found');
      
      const data = snap.data() as Customer;
      const current = data.currentDebt || 0;
      
      // 1. Atualiza saldo do devedor
      tx.update(ref, { currentDebt: Math.max(0, current - amount), updatedAt: Date.now() });

      // 2. Cria transação financeira de entrada para o fechamento (EOD)
      tx.set(firebaseService.getDocRef('transactions', transId), {
        id: transId,
        enterpriseId,
        shopId,
        type: 'income',
        category: 'Debt Payment',
        amount,
        description: `Recebimento de Fiado: ${data.name}`,
        paymentMethod,
        timestamp: Date.now()
      });
    });
    
    logger.info('finance', 'Débito de cliente baixado', { customerId, amount });
  }
}