import { Transaction, RecountRequest, Order, Product } from '../../types';
import { bomEngine } from './BOMEngine';
import { StockReconciliationItem } from './StockReconciliationEngine';
import { InventoryEngine } from './InventoryEngine';
import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';

export class FinanceEngine {
  static async createTransaction(params: {
    enterpriseId: string;
    shopId?: string;
    module: Transaction['module'];
    staffId: string;
    staffName: string;
    type: Transaction['type'];
    amount: number;
    category: string;
    description: string;
    date?: string;
    paymentMethod?: Transaction['paymentMethod'];
    referenceId?: string;
  }) {
    const timestamp = params.date ? new Date(params.date).getTime() : Date.now();
    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      enterpriseId: params.enterpriseId,
      shopId: params.shopId,
      module: params.module,
      staffId: params.staffId,
      staffName: params.staffName,
      type: params.type,
      amount: params.amount,
      category: params.category,
      description: params.description,
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
      status: 'completed',
      paymentMethod: params.paymentMethod || 'other',
      referenceId: params.referenceId,
    };

    await firebaseService.saveItem('transactions', tx.id, tx);
    return tx;
  }

  static summarize(transactions: Transaction[]) {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
  }

  static async listTransactions(enterpriseId: string, shopId?: string | null) {
    const txs = await firebaseService.getDocsByQuery('transactions', [
      { field: 'enterpriseId', op: '==', value: enterpriseId }
    ]) as Transaction[];
    if (!shopId) return txs;
    return txs.filter((tx) => !tx.shopId || tx.shopId === shopId);
  }

  /**
   * Registra despesas fixas mensais (Luz, Água, Gás, Reparos).
   */
  static async recordMonthlyUtility(params: {
    enterpriseId: string;
    shopId: string;
    category: 'Energia' | 'Água' | 'Gás' | 'Internet' | 'Manutenção' | 'Outros';
    amount: number;
    referenceMonth: string; // MM/YYYY
    adminName: string;
  }) {
    const transaction: Transaction = {
      id: `util-${Date.now()}`,
      enterpriseId: params.enterpriseId,
      shopId: params.shopId,
      module: 'generic',
      staffId: 'system',
      type: 'expense',
      category: params.category,
      amount: params.amount,
      description: `Conta de ${params.category} ref. ${params.referenceMonth}`,
      staffName: params.adminName,
      timestamp: Date.now(),
      status: 'completed',
      paymentMethod: 'other',
    };

    await firebaseService.saveItem('transactions', transaction.id, transaction);
    logger.info('finance', 'Despesa fixa mensal registrada', { category: params.category, month: params.referenceMonth });
  }

  static filterTransactions(transactions: Transaction[], type: 'all' | 'income' | 'expense', term: string) {
    return transactions.filter(t => {
      const matchesType = type === 'all' || t.type === type;
      const matchesTerm = t.description.toLowerCase().includes(term.toLowerCase()) || t.category.toLowerCase().includes(term.toLowerCase());
      return matchesType && matchesTerm;
    });
  }

  /**
   * Calcula o DRE consolidado cruzando vendas, ficha técnica (BOM) e perdas de estoque.
   */
  static summarizeDre(
    transactions: Transaction[], 
    recounts: RecountRequest[], 
    orders: Order[], 
    products: Product[], 
    inventory: StockReconciliationItem[],
    taxRate: number = 0.05
  ) {
    // 1. Receita Bruta (Apenas entradas categorizadas como venda ou serviço)
    const receitaBruta = transactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    // 2. Despesas Operacionais (Fixas e Variáveis Administrativas)
    const despesasOperacionais = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    // 3. CMV Real: Explodimos cada pedido entregue via BOM para somar o custo dos insumos consumidos
    const custoMercadoriaVendida = orders
      .filter(o => o.status === 'delivered')
      .reduce((acc, order) => {
        const adjustments = bomEngine.explodeCartToInsumos(
          order.items.map(i => ({ ...i, id: i.productId })), // Mapear para o formato esperado
          products, // Lista de produtos necessária para explodir BOM
          inventory as any // Usa o inventário já passado para o motor
        );
        
        const costOfOrder = adjustments.reduce((sum, adj) => {
          const item = (inventory as any[]).find(i => i.id === adj.inventoryItemId); // Buscar item no inventário
          return sum + (adj.quantityToDeduct * (item?.costPerUnit || 0));
        }, 0);

        return acc + costOfOrder;
      }, 0);

    // 4. Impacto de Reconciliação (Quebras/Perdas identificadas em contagens)
    const impactoReconciliacao = recounts.reduce((acc, r) => acc + (r.varianceValue || 0), 0);

    // 5. Impostos e Deduções
    const impostos = receitaBruta * taxRate;
    const receitaLiquida = receitaBruta - impostos;

    // 5. Resultado Líquido Final
    const resultadoLiquido = receitaLiquida - despesasOperacionais - custoMercadoriaVendida + impactoReconciliacao;

    return { 
      receitaBruta, 
      impostos, 
      receitaLiquida, 
      despesasOperacionais, 
      custoMercadoriaVendida, 
      impactoReconciliacao, 
      resultadoLiquido 
    };
  }
}
