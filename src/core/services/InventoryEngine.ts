import { InventoryItem, Product, ItemModifier } from '../../types';
import { firebaseService } from '../../services/firebaseService';
import { coreEventBus } from '../events/CoreEventBus';
import { bomEngine } from './BOMEngine'; // Importar BOMEngine para explodir composição
import { logger } from './logger';
import { generateSafeId } from '../lib/utils';
import { accountService } from './accountService';
import type { Transaction } from 'firebase/firestore';

export interface StockBatch {
  readonly id: string;
  readonly batchNumber: string;
  readonly expiryDate: number;
  quantity: number;
  readonly receivedAt: number;
}

export interface InventoryAdjustmentItem {
  readonly id?: string;
  readonly productId?: string; // Suporte para origem direta do PDV
  readonly quantity: number;
  readonly name?: string;
  readonly composition?: readonly any[];
  readonly modifiers?: readonly ItemModifier[];
  readonly transactionId?: string;
  readonly eventId?: string;
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
    items: InventoryAdjustmentItem[],
    multiplier: number, // 1 for deduction, -1 for return
    enterpriseId: string,
    shopId: string,
    inventory: InventoryItem[],
    products: Product[] = [],
    existingTx?: Transaction, 
    blockOnZero: boolean = false // Nova trava customizável
  ) {
    // Auditoria de Modificadores: Remove itens do cálculo se houver modificador de exclusão (ex: "Sem Cebola")
    const filteredItems = items.map(item => {
      const exclusionModifiers = item.modifiers?.filter(m => m.type === 'remove' || m.name.toLowerCase().startsWith('sem ')) || [];
      const filteredComposition = item.composition?.filter((comp: any) => 
        !exclusionModifiers.some(mod => mod.name.toLowerCase().includes(comp.name.toLowerCase()))
      );
      return { ...item, composition: filteredComposition };
    });

    // Usar BOMEngine para explodir a composição e resolver substitutos
    const explodedItems = bomEngine.explodeCartToInsumos(
      // Nexus Standard: Normaliza 'productId' vindo da UI para o 'id' interno esperado pelo motor
      filteredItems.map(i => ({ id: i.id || (i as any).productId, quantity: i.quantity, name: i.name, composition: i.composition, modifiers: i.modifiers })) as any,
      products, // Agora passa a lista correta para identificar ingredientes
      inventory
    );

    const adjustments: { id: string; amount: number; type: 'inventory' | 'product' }[] = explodedItems.map(adj => {
      // Determinar se é um insumo ou produto final
      const isInventoryItem = inventory.some(inv => inv.id === adj.inventoryItemId);
      return {
        id: adj.inventoryItemId,
        // Auditoria: Mantemos o valor absoluto para reservas, e o sinal para ajustes físicos
        amount: multiplier === 0 ? adj.quantityToDeduct : adj.quantityToDeduct * multiplier,
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
        const updateLogic = async (tx: Transaction) => {
          // Auditoria: Gathering Phase (READS FIRST)
          // Firestore proíbe leituras após qualquer escrita na transação.
          const refs = finalAdjustments.map(adj => {
            const col = adj.type === 'inventory' ? 'inventory' : 'products';
            return firebaseService.getDocRef(col, adj.id);
          });
          const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));

          // Auditoria: Processing Phase (WRITES LAST)
          finalAdjustments.forEach((adj, idx) => {
            const snap = snapshots[idx];
            const ref = refs[idx];

            if (snap && snap.exists()) {
              const data = snap.data();
              
              // Nexus Standard: Normalização de Identidade para Idempotência
              const sourceItem = items.find(i => (i.id === adj.id || i.productId === adj.id));
              const eventId = sourceItem?.eventId || items.find(i => i.eventId)?.eventId || null;
              const txId = sourceItem?.transactionId || items.find(i => i.transactionId)?.transactionId || null;

              // Fase 4: Garantia de isolamento Multi-tenancy
              // Bloqueia a operação se o item não pertencer à loja ou empresa informada
              if (data.enterpriseId !== enterpriseId || (data.shopId && data.shopId !== shopId)) {
                throw new Error(`Violação de segurança: Item ${adj.id} não pertence a esta unidade.`);
              }

              // Fase 5: Verificação de Idempotência (Mesh Failover)
              // Impede que o mesmo evento de malha processe estoque duas vezes
              if (adj.type === 'inventory' && eventId && data.lastProcessedEventId === eventId) {
                return; // Pula este ajuste, já foi processado
              }

              const stockField = adj.type === 'inventory' ? 'currentStock' : 'stock';
              const reservedField = adj.type === 'inventory' ? 'reservedStock' : 'reserved';
              const currentTotal = Number(data[stockField]) || 0;
              const currentReserved = Number(data[reservedField]) || 0;
              let batches: StockBatch[] = data.batches || [];
              
              const isDuplicate = (txId && data.lastProcessedTxId === txId) || 
                                 (eventId && data.lastProcessedEventId === eventId);

              if (isDuplicate) {
                logger.info('inventory', 'Operação ignorada: Idempotência ativa', { 
                  txId, 
                  eventId, 
                  itemId: adj.id 
                });
                return;
              }
              
              const updatedTxId = txId || data.lastProcessedTxId || null;
              const updatedEventId = eventId || data.lastProcessedEventId || null;

              // Nexus Standard 7.0: Política de Trava de Estoque Zero
              // Impede a conclusão da venda (multiplier 1) se o saldo físico for insuficiente
              if (blockOnZero && multiplier === 1 && (currentTotal - adj.amount) < 0) {
                throw new Error(`Estoque insuficiente para o item: ${data.name}`);
              }

              if (adj.amount > 0) {
                // DEDUÇÃO: Lógica FEFO (First Expired First Out)
                if (currentTotal < adj.amount && !blockOnZero) {
                  // Nexus Standard: Registra discrepância crítica no Audit Log para reconciliação posterior
                  const auditId = generateSafeId('audit-neg');
                  tx.set(firebaseService.getDocRef('audit_logs', auditId), {
                    enterpriseId,
                    shopId,
                    type: 'NEGATIVE_STOCK_EVENT',
                    severity: 'high',
                    itemId: adj.id,
                    itemName: data.name,
                    details: `Venda permitida com estoque insuficiente. Saldo: ${currentTotal}, Necessário: ${adj.amount}. Estoque ficará negativo.`,
                    timestamp: Date.now(),
                    staffId: 'system-engine'
                  });
                  logger.warn('core', 'Estoque insuficiente: permitindo saldo negativo (Política de Unidade)', { id: adj.id });
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
                // Fase 5: Idempotência em reservas para evitar duplicidade via scanner/mesh
                tx.update(ref, { 
                  [reservedField]: currentReserved + adj.amount,
                  lastProcessedEventId: eventId || null,
                  updatedAt: Date.now() 
                });
                return; // Processa o próximo item da transação
              }

              // Auditoria: Permitimos estoque negativo se blockOnZero for false para indicar erro de gestão
              const nextTotal = currentTotal - adj.amount;

              tx.update(ref, { 
                [stockField]: nextTotal,
                batches,
                lastProcessedTxId: updatedTxId,
                lastProcessedEventId: updatedEventId,
                updatedAt: Date.now() 
              });
            }
          });
        };

        if (existingTx) {
          await updateLogic(existingTx);
        } else {
          await firebaseService.runTransaction(updateLogic);
        }
        
        // Auditoria: Notifica apenas APÓS o sucesso da transação
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
  static async releaseReservationToSale(enterpriseId: string, itemId: string, quantity: number, collection: 'inventory' | 'products' = 'inventory', existingTx?: any, blockOnZero: boolean = false) {
    const logic = async (tx: any) => {
      const ref = firebaseService.getDocRef(collection, itemId);
      const snap = await tx.get(ref);
      
      if (snap.exists()) {
        const data = snap.data();
        const stockField = collection === 'inventory' ? 'currentStock' : 'stock';
        const reservedField = collection === 'inventory' ? 'reservedStock' : 'reserved';
        
        const currentTotal = Number(data[stockField]) || 0;
        const currentReserved = Number(data[reservedField]) || 0;
        let batches: StockBatch[] = data.batches || [];

        if (blockOnZero && currentTotal < quantity) {
          throw new Error(`Estoque insuficiente para liberar reserva: ${data.name}`);
        }

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
          [stockField]: currentTotal - quantity,
          [reservedField]: nextReserved,
          batches,
          updatedAt: Date.now() 
        });
      }
    };

    try {
      if (existingTx) await logic(existingTx);
      else await firebaseService.runTransaction(logic);
      
      logger.info('core', 'Reserva liberada com sucesso', { itemId, quantity });
    } catch (error) {
      logger.error('core', 'CRITICAL: Falha ao converter reserva em venda. Estoque pode estar inconsistente.', { itemId, error });
      throw error; // Repropaga para o chamador tratar a UI
    }
  }

  /**
   * Realiza um ajuste manual direto no item de inventário ou produto.
   * Utiliza transação para garantir que o cálculo seja baseado no valor mais recente do servidor.
   */
  static async manualAdjustment(itemId: string, delta: number, collection: 'inventory' | 'products' = 'inventory', existingTx?: any, blockOnZero: boolean = false) {
    const updateLogic = async (tx: any) => {
      const ref = firebaseService.getDocRef(collection, itemId);
      const snap = await tx.get(ref);
      
      if (snap.exists()) {
        const data = snap.data();
        const field = collection === 'inventory' ? 'currentStock' : 'stock';
        const currentTotal = Number(data[field]) || 0;
        let batches: StockBatch[] = data.batches || [];

        // Validação de bloqueio manual
        if (blockOnZero && delta < 0 && currentTotal + delta < 0) {
          throw new Error('Ajuste negado: Estoque ficaria negativo com a trava de segurança ativa.');
        }

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

        const nextTotal = currentTotal + delta;
        tx.update(ref, { [field]: nextTotal, batches, updatedAt: Date.now() });

        // Fase 3: Registro de Auditoria Imutável para ajuste manual
        const auditId = `audit-manual-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        const user = accountService.getCurrentUser();
        tx.set(firebaseService.getDocRef('audit_logs', auditId), {
          enterpriseId: data.enterpriseId,
          shopId: data.shopId,
          staffId: user?.id || 'system',
          staffName: user?.name || 'Sistema',
          action: 'MANUAL_STOCK_ADJUSTMENT',
          referenceId: itemId,
          details: `Ajuste manual em ${data.name}: ${currentTotal} -> ${nextTotal} (Delta: ${delta})`,
          timestamp: Date.now()
        });
      }
    };

    try {
      if (existingTx) {
        await updateLogic(existingTx);
      } else {
        await firebaseService.runTransaction(updateLogic);
      }

      // Notifica o sistema para atualizar dashboards e listas em tempo real
      coreEventBus.emit('inventory:updated', { 
        id: itemId, 
        type: collection,
        amount: delta
      });

      logger.info('core', 'MANUAL_INVENTORY_ADJUSTMENT_SUCCESS', { itemId, delta });
    } catch (error) {
      logger.error('core', 'MANUAL_INVENTORY_ADJUSTMENT_FAILED', { itemId, error });
      throw error;
    }
  }

  /**
   * Reconciliação em Massa (Full Stock Audit)
   * Lê o estado atual, compara com a contagem enviada e lança ajustes apenas onde há diferença.
   */
  static async bulkReconcile(
    enterpriseId: string, 
    shopId: string, 
    counts: Record<string, number>, // ID -> Quantidade Física
    staff: { id: string, name: string }
  ) {
    try {
      await firebaseService.runTransaction(async (tx) => {
        const itemIds = Object.keys(counts);
        const refs = itemIds.map(id => firebaseService.getDocRef('inventory', id));
        const snaps = await Promise.all(refs.map(ref => tx.get(ref)));

        for (let i = 0; i < snaps.length; i++) {
          const snap = snaps[i];
          if (!snap.exists()) continue;

          const data = snap.data();
          const physicalCount = counts[itemIds[i]];
          const currentSystemStock = Number(data.currentStock) || 0;

          if (physicalCount !== currentSystemStock) {
            const delta = physicalCount - currentSystemStock;
            // Aplica ajuste usando a lógica FEFO interna
            await this.manualAdjustment(itemIds[i], delta, 'inventory', tx);
            
            // Log de Auditoria individual por item dentro da transação
            const auditId = generateSafeId('audit-bulk');
            tx.set(firebaseService.getDocRef('audit_logs', auditId), {
              enterpriseId, shopId, staffId: staff.id, staffName: staff.name,
              action: 'BULK_RECONCILE_ADJUST',
              details: `Item ${data.name}: Sistema ${currentSystemStock} -> Físico ${physicalCount} (Delta: ${delta})`,
              timestamp: Date.now()
            });
          }
        }
      });
      logger.info('inventory', 'Reconciliação em massa concluída com sucesso.');
    } catch (error) {
      logger.error('inventory', 'Falha na reconciliação em massa', { error });
      throw error;
    }
  }

  /**
   * Resolve divergências entre o banco de dados local (P2P) e o estado atômico.
   * Chamado automaticamente após o sucesso de uma sincronização de malha.
   */
  static async reconcileAfterSync(enterpriseId: string, shopId: string, items: { id: string, expectedStock: number }[]) {
    logger.info('inventory', 'Iniciando reconciliação automática pós-sync...');
    
    await firebaseService.runTransaction(async (tx) => {
      for (const item of items) {
        const ref = firebaseService.getDocRef('inventory', item.id);
        const snap = await tx.get(ref);
        if (!snap.exists()) continue;
        
        const current = Number(snap.data().currentStock) || 0;
        if (current !== item.expectedStock) {
           tx.update(ref, { 
             currentStock: item.expectedStock, 
             lastReconciledAt: Date.now(),
             updatedAt: Date.now() 
           });
           coreEventBus.emit('inventory:reconciled', { id: item.id, stock: item.expectedStock });
        }
      }
    });
  }
}
        }
      }
    });
  }
}
