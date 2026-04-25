import { Transaction, RecountRequest, Order, Product } from '../../types';
import { bomEngine } from './BOMEngine';
import { StockReconciliationItem } from './StockReconciliationEngine';
import { InventoryEngine } from './InventoryEngine';

export class FinanceEngine {
  static summarize(transactions: Transaction[]) {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense };
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
        const currentInventory = InventoryEngine.listInventory(order.enterpriseId, order.shopId); // Obter inventário atualizado
        const adjustments = bomEngine.explodeCartToInsumos(
          order.items.map(i => ({ ...i, id: i.productId })), // Mapear para o formato esperado
          products,
          currentInventory as any // Passar o inventário para resolução de substitutos
        );
        
        const costOfOrder = adjustments.reduce((sum, adj) => {
          const item = (currentInventory as any[]).find(i => i.id === adj.inventoryItemId); // Buscar item no inventário
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