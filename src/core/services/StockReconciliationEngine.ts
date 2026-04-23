import { firebaseService } from '../../services/firebaseService';
import type { InventoryItem, RecountRequest } from '../../types';

interface ReconcileStockInput {
  enterpriseId: string;
  shopId: string | null;
  item: InventoryItem;
  newStock: number;
  comment: string;
  staffId: string;
  staffName: string;
}

export class StockReconciliationEngine {
  static async listInventory(enterpriseId: string, shopId: string | null): Promise<InventoryItem[]> {
    const data = await firebaseService.getAllDocs('inventory', enterpriseId, shopId);
    return (data as InventoryItem[]).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  static async listRecountRequests(enterpriseId: string, shopId: string | null): Promise<RecountRequest[]> {
    const data = await firebaseService.getAllDocs('recountRequests', enterpriseId, shopId);
    return (data as RecountRequest[]).sort((a, b) => b.date - a.date);
  }

  static async reconcileStock(input: ReconcileStockInput): Promise<RecountRequest> {
    const normalizedNewStock = Math.max(0, Number(input.newStock) || 0);
    const recountRequest: RecountRequest = {
      id: `recount-${Date.now()}`,
      shopId: input.shopId || input.item.shopId,
      itemId: input.item.id,
      itemName: input.item.name,
      previousStock: Number(input.item.currentStock) || 0,
      newStock: normalizedNewStock,
      comment: input.comment.trim() || 'Contagem manual sem observacao',
      date: Date.now(),
      status: 'applied',
    };

    await firebaseService.runTransaction(async (tx) => {
      const inventoryRef = firebaseService.getDocRef('inventory', input.item.id);
      const recountRef = firebaseService.getDocRef('recountRequests', recountRequest.id);

      const inventorySnap = await tx.get(inventoryRef);
      if (!inventorySnap.exists()) {
        throw new Error(`inventory_item_not_found:${input.item.id}`);
      }

      tx.update(inventoryRef, {
        currentStock: normalizedNewStock,
        lastRecountDate: recountRequest.date,
        updatedAt: recountRequest.date,
      });

      tx.set(recountRef, {
        ...recountRequest,
        enterpriseId: input.enterpriseId,
      });
    });

    await firebaseService.addAuditLog({
      enterpriseId: input.enterpriseId,
      shopId: input.shopId || input.item.shopId,
      staffId: input.staffId,
      staffName: input.staffName,
      action: 'stock_reconciliation_applied',
      details: `Item ${input.item.name}: ${input.item.currentStock} -> ${normalizedNewStock}. Motivo: ${recountRequest.comment}`,
      referenceId: recountRequest.id,
    });

    return recountRequest;
  }
}

