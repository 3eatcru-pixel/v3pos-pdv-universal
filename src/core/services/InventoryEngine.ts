import { InventoryItem, Product } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { coreEventBus } from '../events/CoreEventBus';
import { bomEngine } from './BOMEngine'; // Importar BOMEngine para explodir composição
import { logger } from './logger';

export interface StockBatch {
  id: string;
  batchNumber: string;
  expiryDate: number;
  quantity: number;
  receivedAt: number;
}

/**
 * Universal Inventory Engine
 * Handles recursive stock deduction, yield factors, and atomic synchronization.
 */
export class InventoryEngine {
  /**
   * Recursively resolves and adjusts stock for a list of items.
   * Supports complex compositions (combos/kits) and yield factors.
   */
  static async adjustStockRecursive(
    items: { id: string; quantity: number; name?: string; composition?: any; modifiers?: any[] }[],
    multiplier: number, // 1 for deduction, -1 for return
    enterpriseId: string,
    shopId: string,
    inventory: InventoryItem[]
  ) {
    // Usar BOMEngine para explodir a composição e resolver substitutos
    const explodedItems = bomEngine.explodeCartToInsumos(
      items.map(i => ({ id: i.id || (i as any).productId, quantity: i.quantity, name: i.name, composition: i.composition, modifiers: i.modifiers })),
      [], // products não é necessário aqui, BOMEngine já tem acesso ou deveria receber
      inventory
    );

    const adjustments: { id: string; amount: number; type: 'inventory' | 'product' }[] = explodedItems.map(adj => {
      // Determinar se é um insumo ou produto final
      const isInventoryItem = inventory.some(inv => inv.id === adj.inventoryItemId);
      return {
        id: adj.inventoryItemId,
        amount: adj.quantityToDeduct * multiplier,
        type: isInventoryItem ? 'inventory' : 'product' // Assumindo que se não é inventory, é product
      };
    });

    // Consolidar ajustes para o caso de múltiplos itens do carrinho usarem o mesmo insumo
    const consolidatedAdjustments: { [key: string]: { id: string; amount: number; type: 'inventory' | 'product' } } = {};
    adjustments.forEach(adj => {
      const key = `${adj.type}-${adj.id}`;
      if (consolidatedAdjustments[key]) {
        consolidatedAdjustments[key].amount += adj.amount;
      } else {
        consolidatedAdjustments[key] = { ...adj };
      }
    });

    const finalAdjustments = Object.values(consolidatedAdjustments);

    if (finalAdjustments.length > 0) {
      try {
        await firebaseService.runTransaction(async (tx) => {
          for (const adj of finalAdjustments) {
            const collectionName = adj.type === 'inventory' ? 'inventory' : 'products';
            const ref = firebaseService.getDocRef(collectionName, adj.id);
            const snap = await tx.get(ref);
            
            if (snap.exists()) {
              const data = snap.data();
              const stockField = adj.type === 'inventory' ? 'currentStock' : 'stock';
              const reservedField = adj.type === 'inventory' ? 'reservedStock' : 'reserved';
              const currentTotal = Number(data[stockField]) || 0;
              const currentReserved = Number(data[reservedField]) || 0;
              let batches: StockBatch[] = data.batches || [];
              
              if (adj.amount > 0) {
                // DEDUÇÃO: Lógica FEFO (First Expired First Out)
                if (currentTotal < adj.amount) {
                  logger.warn('core', 'Estoque insuficiente para ajuste atômico', { id: adj.id, currentTotal, requested: adj.amount });
                }

                let remainingToDeduct = adj.amount;
                // Ordena por data de validade (mais próxima primeiro)
                batches = [...batches].sort((a, b) => a.expiryDate - b.expiryDate);
                
                for (const batch of batches) {
                  if (remainingToDeduct <= 0) break;
                  const deduct = Math.min(batch.quantity, remainingToDeduct);
                  batch.quantity -= deduct;
                  remainingToDeduct -= deduct;
                }
              } else if (adj.amount < 0) {
                // ADIÇÃO (Retorno): Incrementa no lote com maior validade ou cria um novo
                const addQty = Math.abs(adj.amount);
                if (batches.length > 0) {
                  const sortedByExpiryDesc = [...batches].sort((a, b) => b.expiryDate - a.expiryDate);
                  sortedByExpiryDesc[0].quantity += addQty;
                  batches = sortedByExpiryDesc;
                } else {
                  batches.push({
                    id: `batch-${Date.now()}`,
                    batchNumber: 'GENERIC-STOCK',
                    expiryDate: Date.now() + (365 * 24 * 60 * 60 * 1000), // +1 ano default
                    quantity: addQty,
                    receivedAt: Date.now()
                  });
                }
              } else if (multiplier === 0) {
                // RESERVA: Incrementa o saldo reservado sem mexer no estoque físico
                tx.update(ref, { 
                  [reservedField]: currentReserved + adj.quantityToDeduct,
                  updatedAt: Date.now() 
                });
                continue; // Processa o próximo item da transação
              }

              const nextTotal = Math.max(0, currentTotal - adj.amount);
              
              tx.update(ref, { 
                [stockField]: nextTotal,
                batches,
                updatedAt: Date.now() 
              });
            }
          }
        });
        
        // Notify the rest of the system via Event Bus
        finalAdjustments.forEach(adj => {
          coreEventBus.emit('inventory:updated', { 
            id: adj.id, 
            type: adj.type,
            amount: -adj.amount
          });
        });

        logger.info('core', 'INVENTORY_ADJUSTMENT_SUCCESS', { count: finalAdjustments.length });
      } catch (error) {
        logger.error('core', 'INVENTORY_ADJUSTMENT_FAILED', { error });
        throw error;
      }
    }
  }

  /**
   * Converte uma reserva em venda efetiva.
   * Abate o reservedStock e o currentStock (via FEFO).
   */
  static async releaseReservationToSale(enterpriseId: string, itemId: string, quantity: number, collection: 'inventory' | 'products' = 'inventory') {
    try {
      await firebaseService.runTransaction(async (tx) => {
        const ref = firebaseService.getDocRef(collection, itemId);
        const snap = await tx.get(ref);
        
        if (snap.exists()) {
          const data = snap.data();
          const stockField = collection === 'inventory' ? 'currentStock' : 'stock';
          const reservedField = collection === 'inventory' ? 'reservedStock' : 'reserved';
          
          const currentTotal = Number(data[stockField]) || 0;
          const currentReserved = Number(data[reservedField]) || 0;
          let batches: StockBatch[] = data.batches || [];

          // 1. Abate reserva
          const nextReserved = Math.max(0, currentReserved - quantity);
          
          // 2. Abate estoque físico via FEFO
          let remaining = quantity;
          batches = [...batches].sort((a, b) => a.expiryDate - b.expiryDate);
          for (const batch of batches) {
            if (remaining <= 0) break;
            const deduct = Math.min(batch.quantity, remaining);
            batch.quantity -= deduct;
            remaining -= deduct;
          }

          tx.update(ref, { 
            [stockField]: Math.max(0, currentTotal - quantity),
            [reservedField]: nextReserved,
            batches,
            updatedAt: Date.now() 
          });
        }
      });
    } catch (error) {
      logger.error('core', 'Falha ao converter reserva em venda', { itemId, error });
    }
  }

  /**
   * Realiza um ajuste manual direto no item de inventário ou produto.
   * Utiliza transação para garantir que o cálculo seja baseado no valor mais recente do servidor.
   */
  static async manualAdjustment(itemId: string, delta: number, collection: 'inventory' | 'products' = 'inventory') {
    try {
      await firebaseService.runTransaction(async (tx) => {
        const ref = firebaseService.getDocRef(collection, itemId);
        const snap = await tx.get(ref);
        
        if (snap.exists()) {
          const data = snap.data();
          const field = collection === 'inventory' ? 'currentStock' : 'stock';
          const currentTotal = Number(data[field]) || 0;
          let batches: StockBatch[] = data.batches || [];

          if (delta < 0) {
            // DEDUÇÃO MANUAL: Lógica FEFO
            let remainingToDeduct = Math.abs(delta);
            batches = [...batches].sort((a, b) => a.expiryDate - b.expiryDate);
            for (const batch of batches) {
              if (remainingToDeduct <= 0) break;
              const deduct = Math.min(batch.quantity, remainingToDeduct);
              batch.quantity -= deduct;
              remainingToDeduct -= deduct;
            }
          } else if (delta > 0) {
            // ADIÇÃO MANUAL: Adiciona ao lote de maior validade ou cria genérico
            if (batches.length > 0) {
              const sortedByExpiryDesc = [...batches].sort((a, b) => b.expiryDate - a.expiryDate);
              sortedByExpiryDesc[0].quantity += delta;
              batches = sortedByExpiryDesc;
            } else {
              batches.push({
                id: `batch-manual-${Date.now()}`,
                batchNumber: 'MANUAL-ADJ',
                expiryDate: Date.now() + (365 * 24 * 60 * 60 * 1000),
                quantity: delta,
                receivedAt: Date.now()
              });
            }
          }

          const nextTotal = Math.max(0, currentTotal + delta);
          
          tx.update(ref, { 
            [field]: nextTotal, 
            batches,
            updatedAt: Date.now() 
          });
        }
      });
      logger.info('core', 'MANUAL_INVENTORY_ADJUSTMENT_SUCCESS', { itemId, delta });
    } catch (error) {
      logger.error('core', 'MANUAL_INVENTORY_ADJUSTMENT_FAILED', { itemId, error });
      throw error;
    }
  }
}
