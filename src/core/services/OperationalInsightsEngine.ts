import { InventoryItem, Order, Product } from '../../types';
import { logger } from './logger';

/**
 * OperationalInsightsEngine - Motor de Inteligência de Negócio
 * Detecta anomalias financeiras e operacionais baseadas em estoque e vendas.
 */
export class OperationalInsightsEngine {
  /**
   * Alerta de Validade em Reais (Requisito 14)
   * Calcula o valor em risco baseado nos lotes que vencem nos próximos X dias.
   */
  static calculateExpiryRiskValue(inventory: InventoryItem[], days: number = 5): number {
    const limit = Date.now() + (days * 24 * 60 * 60 * 1000);
    let totalRisk = 0;

    inventory.forEach(item => {
      const expiringBatches = (item.batches || []).filter(b => b.expiryDate <= limit);
      const qtyAtRisk = expiringBatches.reduce((sum, b) => sum + b.quantity, 0);
      totalRisk += qtyAtRisk * (item.costPerUnit || 0);
    });

    return totalRisk;
  }

  /**
   * Alerta de Produtos Parados (Requisito 10)
   * Identifica itens que não tiveram saída nos últimos 30 dias.
   */
  static getDeadStock(inventory: InventoryItem[], orders: Order[]): InventoryItem[] {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const soldIds = new Set(orders.filter(o => o.closedAt && o.closedAt > thirtyDaysAgo).flatMap(o => o.items.map(i => i.productId)));

    return inventory.filter(item => !soldIds.has(item.id) && (item.currentStock || 0) > 0);
  }

  /**
   * Detecção de Vazamento de Estoque (Requisito 13)
   * Compara a baixa teórica das vendas com a baixa física registrada.
   */
  static detectStockLeak(itemId: string, theoreticalStock: number, physicalCount: number): { leaked: number, lossValue: number } | null {
    if (physicalCount < theoreticalStock) {
      const leaked = theoreticalStock - physicalCount;
      return { leaked, lossValue: 0 }; // O valor é calculado no widget com o costPerUnit
    }
    return null;
  }
}