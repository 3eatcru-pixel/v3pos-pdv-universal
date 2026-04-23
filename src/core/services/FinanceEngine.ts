import { firebaseService } from '../../services/firebaseService';
import type { RecountRequest, Transaction } from '../../types';

export interface CreateTransactionInput {
  enterpriseId: string;
  shopId: string | null;
  module: Transaction['module'];
  staffId: string;
  staffName: string;
  type: Transaction['type'];
  amount: number;
  category: string;
  description: string;
  date?: string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

export interface DreSummary {
  receitaBruta: number;
  despesasOperacionais: number;
  impactoReconciliacao: number;
  resultadoLiquido: number;
}

export class FinanceEngine {
  static async listTransactions(enterpriseId: string, shopId: string | null): Promise<Transaction[]> {
    const data = await firebaseService.getAllDocs('transactions', enterpriseId, shopId);
    return (data as Transaction[]).sort((a, b) => b.timestamp - a.timestamp);
  }

  static buildTransactionPayload(input: CreateTransactionInput): Transaction {
    return {
      id: `trans-${Math.random().toString(36).slice(2, 11)}`,
      enterpriseId: input.enterpriseId,
      shopId: input.shopId || undefined,
      type: input.type,
      amount: Math.max(0, input.amount),
      category: input.category.trim(),
      description: input.description.trim(),
      timestamp: input.date ? new Date(input.date).getTime() : Date.now(),
      status: 'completed',
      module: input.module,
      paymentMethod: 'other',
      staffId: input.staffId,
      staffName: input.staffName,
    };
  }

  static async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const payload = this.buildTransactionPayload(input);
    await firebaseService.saveItem('transactions', payload.id, payload);
    return payload;
  }

  static summarize(transactions: Transaction[]): FinanceSummary {
    const totalIncome = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }

  static summarizeDre(transactions: Transaction[], recountRequests: RecountRequest[], inventoryCostMap: Record<string, number>): DreSummary {
    const receitaBruta = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const despesasOperacionais = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const impactoReconciliacao = recountRequests.reduce((sum, recount) => {
      const cost = inventoryCostMap[recount.itemId] ?? 0;
      const diff = recount.newStock - recount.previousStock;
      return sum + diff * cost;
    }, 0);

    return {
      receitaBruta,
      despesasOperacionais,
      impactoReconciliacao,
      resultadoLiquido: receitaBruta - despesasOperacionais + impactoReconciliacao,
    };
  }

  static filterTransactions(transactions: Transaction[], filterType: 'all' | 'income' | 'expense', searchTerm: string): Transaction[] {
    const normalizedTerm = searchTerm.trim().toLowerCase();
    return transactions.filter((t) => {
      const matchesSearch =
        normalizedTerm.length === 0 ||
        t.description.toLowerCase().includes(normalizedTerm) ||
        t.category.toLowerCase().includes(normalizedTerm);
      const matchesType = filterType === 'all' || t.type === filterType;
      return matchesSearch && matchesType;
    });
  }
}
