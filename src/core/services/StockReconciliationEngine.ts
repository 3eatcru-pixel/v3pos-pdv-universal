import { firebaseService } from '../../services/firebaseService';
import type { InventoryItem, Product, RecountRequest, StockCountSession } from '../../types';

export interface StockReconciliationItem {
  id: string;
  name: string;
  shopId: string;
  unit: string;
  currentStock: number;
  costPerUnit: number;
  sourceType: 'inventory' | 'product';
}

interface ReconcileStockInput {
  enterpriseId: string;
  shopId: string | null;
  item: StockReconciliationItem;
  newStock: number;
  comment: string;
  staffId: string;
  staffName: string;
  approvalThresholdPercent?: number;
  approverId?: string;
  approverName?: string;
  sessionId?: string;
}

interface OpenCountSessionInput {
  enterpriseId: string;
  shopId: string;
  module: StockCountSession['module'];
  staffId: string;
  staffName: string;
  signature: string;
}

interface CloseCountSessionInput {
  enterpriseId: string;
  sessionId: string;
  staffId: string;
  staffName: string;
  signature: string;
}

export class StockReconciliationEngine {
  static async listInventory(enterpriseId: string, shopId: string | null): Promise<InventoryItem[]> {
    const queryConditions = [{ field: 'enterpriseId', op: '==', value: enterpriseId }];
    if (shopId) queryConditions.push({ field: 'shopId', op: '==', value: shopId });
    const data = await firebaseService.getDocsByQuery('inventory', queryConditions);
    return (data as InventoryItem[]).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  static async listStockItems(enterpriseId: string, shopId: string | null): Promise<StockReconciliationItem[]> {
    const queryConditions = [{ field: 'enterpriseId', op: '==', value: enterpriseId }];
    if (shopId) queryConditions.push({ field: 'shopId', op: '==', value: shopId });

    const [inventory, products] = await Promise.all([
      firebaseService.getDocsByQuery('inventory', queryConditions),
      firebaseService.getDocsByQuery('products', queryConditions),
    ]);

    const inventoryItems = (inventory as InventoryItem[]).map((item) => ({
      id: item.id,
      name: item.name,
      shopId: item.shopId,
      unit: item.unit || 'un',
      currentStock: Number(item.currentStock) || 0,
      costPerUnit: Number(item.costPerUnit) || 0,
      sourceType: 'inventory' as const,
    }));

    const productItems = (products as Product[]).map((item) => {
      const maybe = item as Product & {
        cost?: number;
        costPrice?: number;
        unitCost?: number;
      };
      const inferredCost = Number(maybe.costPrice ?? maybe.unitCost ?? maybe.cost ?? 0) || 0;
      return {
        id: item.id,
        name: item.name,
        shopId: item.shopId,
        unit: item.unit || 'un',
        currentStock: Number(item.stock) || 0,
        costPerUnit: inferredCost,
        sourceType: 'product' as const,
      };
    });

    return [...inventoryItems, ...productItems].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  static async listRecountRequests(enterpriseId: string, shopId: string | null): Promise<RecountRequest[]> {
    const queryConditions = [{ field: 'enterpriseId', op: '==', value: enterpriseId }];
    if (shopId) queryConditions.push({ field: 'shopId', op: '==', value: shopId });
    const data = await firebaseService.getDocsByQuery('recountRequests', queryConditions);
    return (data as RecountRequest[]).sort((a, b) => b.date - a.date);
  }

  static async listCountSessions(enterpriseId: string, shopId: string | null): Promise<StockCountSession[]> {
    const queryConditions = [{ field: 'enterpriseId', op: '==', value: enterpriseId }];
    if (shopId) queryConditions.push({ field: 'shopId', op: '==', value: shopId });
    const data = await firebaseService.getDocsByQuery('stockCountSessions', queryConditions);
    return (data as StockCountSession[]).sort((a, b) => b.openedAt - a.openedAt);
  }

  static async openBlindCountSession(input: OpenCountSessionInput): Promise<StockCountSession> {
    const signature = input.signature.trim();
    if (!signature) throw new Error('missing_open_signature');

    const session: StockCountSession = {
      id: `count-session-${Date.now()}`,
      enterpriseId: input.enterpriseId,
      shopId: input.shopId,
      module: input.module,
      mode: 'blind',
      status: 'open',
      openedAt: Date.now(),
      openedById: input.staffId,
      openedByName: input.staffName,
      openSignature: signature,
    };

    await firebaseService.saveItem('stockCountSessions', session.id, session);
    return session;
  }

  static async closeBlindCountSession(input: CloseCountSessionInput): Promise<StockCountSession> {
    const signature = input.signature.trim();
    if (!signature) throw new Error('missing_close_signature');

    const ref = firebaseService.getDocRef('stockCountSessions', input.sessionId);
    const session = await firebaseService.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error(`count_session_not_found:${input.sessionId}`);
      const data = snap.data() as StockCountSession;
      if (data.enterpriseId !== input.enterpriseId) throw new Error(`count_session_tenant_mismatch:${input.sessionId}`);
      if (data.status !== 'open') throw new Error(`count_session_not_open:${input.sessionId}`);

      const next: StockCountSession = {
        ...data,
        status: 'closed',
        closedAt: Date.now(),
        closedById: input.staffId,
        closedByName: input.staffName,
        closeSignature: signature,
      };
      tx.update(ref, {
        status: next.status,
        closedAt: next.closedAt,
        closedById: next.closedById,
        closedByName: next.closedByName,
        closeSignature: next.closeSignature,
        updatedAt: Date.now(),
      });
      return next;
    });

    return session;
  }

  static async reconcileStock(input: ReconcileStockInput): Promise<RecountRequest> {
    const normalizedNewStock = Math.max(0, Number(input.newStock) || 0);
    const previousStock = Number(input.item.currentStock) || 0;
    const costPerUnit = Number(input.item.costPerUnit) || 0;
    const varianceValue = (normalizedNewStock - previousStock) * costPerUnit;
    const diff = normalizedNewStock - previousStock;
    const adjustmentPercent = previousStock === 0
      ? (normalizedNewStock === 0 ? 0 : 100)
      : (Math.abs(diff) / Math.abs(previousStock)) * 100;
    const approvalThresholdPercent = Math.max(0, Number(input.approvalThresholdPercent ?? 5));
    const approvalRequired = adjustmentPercent >= approvalThresholdPercent;
    if (approvalRequired && !input.approverName?.trim()) {
      throw new Error(`approval_required:${input.item.id}`);
    }

    const recountRequest: RecountRequest = {
      id: `recount-${Date.now()}`,
      shopId: input.shopId || input.item.shopId,
      itemId: input.item.id,
      itemName: input.item.name,
      itemSourceType: input.item.sourceType,
      previousStock,
      newStock: normalizedNewStock,
      adjustmentPercent,
      approvalRequired,
      approvedById: approvalRequired ? (input.approverId || 'manual-approver') : undefined,
      approvedByName: approvalRequired ? input.approverName?.trim() : undefined,
      staffId: input.staffId,
      staffName: input.staffName,
      sessionId: input.sessionId,
      costPerUnit,
      varianceValue,
      comment: input.comment.trim() || 'Contagem manual sem observacao',
      date: Date.now(),
      status: 'applied',
    };

    await firebaseService.runTransaction(async (tx) => {
      const isInventory = input.item.sourceType === 'inventory';
      const targetCollection = isInventory ? 'inventory' : 'products';
      const targetStockField = isInventory ? 'currentStock' : 'stock';
      const stockRef = firebaseService.getDocRef(targetCollection, input.item.id);
      const recountRef = firebaseService.getDocRef('recountRequests', recountRequest.id);

      const stockSnap = await tx.get(stockRef);
      if (!stockSnap.exists()) {
        throw new Error(`stock_item_not_found:${input.item.id}`);
      }

      tx.update(stockRef, {
        [targetStockField]: normalizedNewStock,
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
      details: `Item ${input.item.name} (${input.item.sourceType}): ${previousStock} -> ${normalizedNewStock}. Motivo: ${recountRequest.comment}. Ajuste: ${adjustmentPercent.toFixed(2)}%.`,
      referenceId: recountRequest.id,
    });

    return recountRequest;
  }
}
