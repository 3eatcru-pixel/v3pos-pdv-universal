import { CoreSale, Staff } from '../types';
import { logger } from './logger';
import { firebaseService } from '../../services/firebaseService';
import { DailyAggregatorEngine } from './DailyAggregatorEngine';
import { coreEventBus } from '../events/CoreEventBus';
import { InventoryEngine } from './InventoryEngine';
import { BookingDepositEngine } from './BookingDepositEngine';
import { MeteringEngine } from './MeteringEngine';
import { accountService } from './accountService';
import { EmptyBottleEngine } from './EmptyBottleEngine';
import { CustomerEngine } from './CustomerEngine';

class SalesService {
  async processSale(sale: CoreSale, items: any[], depositId?: string, managerPin?: string, appliedBottleCreditIds?: string[], customerId?: string) {
    logger.info('core', 'Processing real sale', { saleId: sale.id, total: sale.total, customerId });
    
    // Save to Firebase
    try {
      const enterpriseId = sale.enterpriseId;
      const shopId = sale.shopId;
      const tenant = await accountService.getCurrentTenant();
      
      // Requisito 7: Se o plano for Solo (Drive-only), salva apenas localmente (via P2P/Mesh)
      // e aguarda o backup de 10 min para o Drive.
      const isDriveOnly = (tenant as any)?.storageStrategy === 'drive_only';

      if (isDriveOnly && !(sale as any).forcePush) {
        logger.info('core', 'Modo Solo: Venda salva localmente (SQLite/Mesh). Ignorando Firestore.');
        // Emitimos o evento para o MeshNetwork local (Requisito 4)
        items.forEach(item => coreEventBus.emit('product:stock_decremented', { productId: item.productId || item.id, quantity: item.quantity, saleId: sale.id }));
        return;
      }

      // Auditoria: Validação de Autorização para bypass de estoque (Gerente/Owner)
      let isManagerAuthorized = false;
      if (managerPin) {
        const staffWithPin = await firebaseService.getDocsByQuery('staff', [
          { field: 'enterpriseId', op: '==', value: enterpriseId },
          { field: 'pin', op: '==', value: managerPin }
        ]) as Staff[];
        
        const authorized = staffWithPin.find(s => ['manager', 'owner', 'dev'].includes(s.role));
        if (authorized) isManagerAuthorized = true;
        else throw new Error('pin_autorizacao_invalido');
      }

      await firebaseService.runTransaction(async (tx) => {
        // 1. Auditoria: Coleta de Leituras (Gathering Phase)
        // Firestore exige que todas as leituras (tx.get) precedam as escritas.
        
        const enterpriseRef = firebaseService.getDocRef('enterprises', enterpriseId);
        const itemIds = Array.from(new Set(items.map(i => i.productId || i.id).filter(Boolean)));
        const customerRef = customerId ? firebaseService.getDocRef('customers', customerId) : null;
        
        const inventoryRefs = itemIds.map(id => firebaseService.getDocRef('inventory', id));
        const productRefs = itemIds.map(id => firebaseService.getDocRef('products', id));

        const [entSnap, customerSnap, ...itemSnaps] = await Promise.all([
          tx.get(enterpriseRef),
          customerRef ? tx.get(customerRef) : Promise.resolve(null),
          ...inventoryRefs.map(ref => tx.get(ref)),
          ...productRefs.map(ref => tx.get(ref))
        ]);

        // 1.5 Auditoria: Indexação de Snapshots para performance O(1) (Crucial para Mobile/Tablet)
        const inventoryMap = new Map(itemSnaps.slice(0, inventoryRefs.length).filter(s => s.exists()).map(s => [s.id, s.data()]));
        const productsMap = new Map(itemSnaps.slice(inventoryRefs.length).filter(s => s.exists()).map(s => [s.id, s.data()]));

        // 2. Auditoria: PROCESSAMENTO DE ESTOQUE
        if (items && items.length > 0) {
          const multiplier = (((sale as any).module === 'construction') && (sale as any).logistics?.type === 'scheduled_delivery') ? 0 : 1;
          
          await InventoryEngine.adjustStockRecursive(
            items, 
            multiplier, 
            enterpriseId, 
            shopId, 
            Array.from(inventoryMap.values()) as any, 
            Array.from(productsMap.values()) as any,
            tx,
            (tenant as any)?.blockOnZeroStock && !isManagerAuthorized
          );
        }

        // 3. Auditoria: Validação de Cota e Créditos (Últimas escritas antes do commit)
        const canProceed = await MeteringEngine.trackUsage(enterpriseId, 'SALE', tenant?.cloudConfig, tx, entSnap);
        if (!canProceed) throw new Error('quota_exceeded');

        if (depositId) {
          await BookingDepositEngine.consumeDeposit(tx, depositId, sale.id);
        }

        if (appliedBottleCreditIds && appliedBottleCreditIds.length > 0) {
          for (const creditId of appliedBottleCreditIds) {
            const creditRef = firebaseService.getDocRef('bottle_credits', creditId);
            tx.update(creditRef, {
              status: 'used',
              usedAt: Date.now(),
              saleId: sale.id
            });
          }
        }

        // 3.5 Auditoria Fiado: Se o pagamento for fiado, registra a dívida no banco do cliente
        if (sale.paymentMethod === 'fiado' && customerId) {
          await CustomerEngine.recordDebt(customerId, sale.total, tx, customerSnap);
        }

        // 4. Salva o pedido final (SNAPSHOT DE CUSTO O(1))
        const orderRef = firebaseService.getDocRef('orders', sale.id);
        tx.set(orderRef, {
          ...sale,
          items: items.map(item => {
            const targetId = item.productId || item.id;
            // Tenta obter o custo do mapa de inventário, senão do mapa de produtos
            const data = inventoryMap.get(targetId) || productsMap.get(targetId);
            return { ...item, unitCost: (data as any)?.costPerUnit ?? (data as any)?.cost ?? 0 };
          }),
          status: 'delivered',
          startTime: Date.now(),
          closedAt: Date.now(),
          depositId: depositId || null
        });
      });

      // Dispara evento com ID da venda para garantir que o Mesh não duplique a baixa
      if (items && items.length > 0) {
        items.forEach(item => {
          coreEventBus.emit('product:stock_decremented', { 
            productId: item.productId || item.id, 
            quantity: item.quantity,
            saleId: sale.id 
          });
        });
      }

      // BFF Aggregation: Update Daily Summary for faster Dashboard rendering
      await DailyAggregatorEngine.updateSummary(sale, items);

    } catch (error) {
      logger.error('core', 'Erro ao processar venda no core', { error });
      throw error;
    }
  }

  /**
   * Transfere o consumo e o estado de uma mesa para outra.
   */
  async transferTable(enterpriseId: string, shopId: string, fromTableId: string, toTableId: string, staffId: string, reason: string) {
    await firebaseService.runTransaction(async (tx) => {
      const fromRef = firebaseService.getDocRef('tables', fromTableId);
      const toRef = firebaseService.getDocRef('tables', toTableId);
      
      const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
      
      if (!fromSnap.exists() || !toSnap.exists()) throw new Error('Mesa não localizada');
      if (toSnap.data().status === 'occupied') throw new Error('Mesa de destino já está ocupada');

      const tableData = fromSnap.data();

      tx.update(toRef, { 
        status: 'occupied', 
        activeOrder: tableData.activeOrder,
        updatedAt: Date.now() 
      });
      
      tx.update(fromRef, { 
        status: 'available', 
        activeOrder: null,
        updatedAt: Date.now() 
      });

      // Auditoria: Registra a movimentação
      tx.set(firebaseService.getDocRef('audit_logs', `audit-${Date.now()}`), {
        enterpriseId, shopId, staffId, action: 'TABLE_TRANSFER',
        details: `Mesa ${tableData.number} -> Mesa ${toSnap.data().number}. Motivo: ${reason}`,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Registra a saída de cliente sem pagamento (Loss Event).
   */
  async recordWalkout(enterpriseId: string, shopId: string, tableId: string, staffId: string, reason: string) {
    await firebaseService.runTransaction(async (tx) => {
      const tableRef = firebaseService.getDocRef('tables', tableId);
      const snap = await tx.get(tableRef);
      const tableData = snap.data();

      tx.update(tableRef, { status: 'available', activeOrder: null, updatedAt: Date.now() });

      tx.set(firebaseService.getDocRef('audit_logs', `audit-${Date.now()}`), {
        enterpriseId, shopId, staffId, 
        action: 'CUSTOMER_WALKOUT',
        details: `Mesa ${tableData.number} abandonada. Motivo: ${reason}`,
        timestamp: Date.now(),
        isLoss: true
      });
    });
  }

  /**
   * Cancela um item ou pedido com obrigatoriedade de motivo (Audit Trail).
   */
  async voidOrder(enterpriseId: string, orderId: string, staffId: string, reason: string) {
    if (!reason || reason.length < 4) throw new Error('Motivo de cancelamento obrigatório.');

    await firebaseService.runTransaction(async (tx) => {
      const orderRef = firebaseService.getDocRef('orders', orderId);
      const snap = await tx.get(orderRef);

      if (!snap.exists()) throw new Error('Pedido não encontrado.');
      const orderData = snap.data() as CoreSale;
      if (orderData.status === 'voided') throw new Error('Este pedido já foi estornado.');

      const inventory = await firebaseService.getDocsByQuery('inventory', [{ field: 'enterpriseId', op: '==', value: enterpriseId }]);
      const products = await firebaseService.getDocsByQuery('products', [{ field: 'enterpriseId', op: '==', value: enterpriseId }]);

      await InventoryEngine.adjustStockRecursive(
        orderData.items.map((i) => ({ id: i.productId || i.id || '', quantity: i.quantity, name: i.name })), -1, enterpriseId, orderData.shopId, inventory as any, products as any, tx
      );

      const auditRef = firebaseService.getDocRef('audit_logs', `void-${orderId}-${Date.now()}`);
      tx.set(auditRef, {
        enterpriseId, shopId: orderData.shopId, staffId, action: 'ORDER_VOIDED',
        details: `Pedido ${orderId} estornado. Motivo: ${reason}`, timestamp: Date.now()
      });

      tx.update(orderRef, { status: 'voided', voidReason: reason, voidedBy: staffId, updatedAt: Date.now() });
    });

    logger.warn('security', 'Pedido Estornado', { orderId, reason, staffId });
  }
}

class ProductService {
  async updateInventory(productId: string, quantity: number) {
    logger.info('core', 'Updating base inventory fuel', { productId, quantity });
    await firebaseService.adjustProductStockAtomic(productId, quantity);
  }
}

export const coreSalesService = new SalesService();
export const coreProductService = new ProductService();
