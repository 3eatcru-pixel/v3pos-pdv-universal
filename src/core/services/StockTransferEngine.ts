import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { generateSafeId } from '../lib/utils';
import { CommunicationEngine } from './CommunicationEngine'; // Usar o novo motor de comunicação

export interface TransferItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number; // Adicionado para auditoria de valor de perda
  type: 'inventory' | 'product';
  masterId?: string;
}

export interface StockTransfer {
  id: string;
  enterpriseId: string;
  sourceShopId: string;
  destinationShopId: string;
  items: TransferItem[];
  status: 'shipped' | 'received' | 'cancelled';
  createdAt: number;
  shippedAt: number;
  receivedAt?: number;
  createdBy: string;
  receivedBy?: string;
  digitalGuideId: string;
  notes?: string;
  hasDivergence?: boolean;
  receivedQuantities?: Record<string, number>;
}

export class StockTransferEngine {
  /**
   * Inicia a movimentação de mercadorias entre unidades.
   * Gera uma Guia de Remessa Digital (GRD) e abate o estoque da origem.
   */
  static async initiateTransfer(params: {
    enterpriseId: string;
    sourceShopId: string;
    destinationShopId: string;
    items: TransferItem[];
    userId: string;
    userName: string;
    notes?: string;
  }): Promise<StockTransfer> {
    const transferId = generateSafeId('xfer');
    const digitalGuideId = `GRD-${Date.now()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

    const transfer: StockTransfer = {
      id: transferId,
      enterpriseId: params.enterpriseId,
      sourceShopId: params.sourceShopId,
      destinationShopId: params.destinationShopId,
      items: params.items,
      status: 'shipped',
      createdAt: Date.now(),
      shippedAt: Date.now(),
      createdBy: params.userName,
      digitalGuideId,
      notes: params.notes,
    };

    try {
      await firebaseService.runTransaction(async (tx) => {
        for (const item of params.items) {
          const collection = item.type === 'inventory' ? 'inventory' : 'products';
          const stockField = item.type === 'inventory' ? 'currentStock' : 'stock';
          const ref = firebaseService.getDocRef(collection, item.id);
          const snap = await tx.get(ref);

          if (!snap.exists()) throw new Error(`Item ${item.name} não encontrado na origem.`);
          
          const current = Number(snap.data()[stockField]) || 0;
          if (current < item.quantity) {
            throw new Error(`Estoque insuficiente de ${item.name}. Disponível: ${current}, Necessário: ${item.quantity}`);
          }

          tx.update(ref, { 
            [stockField]: current - item.quantity,
            updatedAt: Date.now() 
          });
        }

        const transferRef = firebaseService.getDocRef('stock_transfers', transferId);
        tx.set(transferRef, transfer);
      });

      logger.info('inventory', 'Guia de Remessa Digital emitida', { digitalGuideId, transferId });
      return transfer;
    } catch (error) {
      logger.error('inventory', 'Falha ao iniciar transferência', { error });
      throw error;
    }
  }

  /**
   * Conclui a transferência no destino, adicionando os itens ao estoque local.
   * Implementa lógica de divergência: se o recebido < enviado, alerta o proprietário.
   */
  static async finalizeTransfer(transferId: string, userId: string, userName: string, receivedQuantities: Record<string, number>): Promise<void> {
    try {
      await firebaseService.runTransaction(async (tx) => {
        const transferRef = firebaseService.getDocRef('stock_transfers', transferId);
        const snap = await tx.get(transferRef);
        if (!snap.exists()) throw new Error('Transferência não localizada.');
        
        const transfer = snap.data() as StockTransfer;
        if (transfer.status !== 'shipped') throw new Error('Esta remessa já foi processada ou cancelada.');

        let hasDivergence = false;
        const divergenceDetails: string[] = [];

        for (const item of transfer.items) {
          const collection = item.type === 'inventory' ? 'inventory' : 'products';
          const stockField = item.type === 'inventory' ? 'currentStock' : 'stock';
          const actualReceived = receivedQuantities[item.id] ?? item.quantity;

          if (actualReceived < item.quantity) {
            hasDivergence = true;
            divergenceDetails.push(`${item.name}: Enviado ${item.quantity}, Recebido ${actualReceived}`);
          }
          
          // Localiza o item correspondente no destino (assumindo IDs pareados por clonagem)
          const destRef = firebaseService.getDocRef(collection, item.id);
          const destSnap = await tx.get(destRef);

          if (destSnap.exists()) {
            const current = Number(destSnap.data()[stockField]) || 0;
            tx.update(destRef, { 
              [stockField]: current + actualReceived,
              updatedAt: Date.now() 
            });
          } else {
            logger.warn('inventory', 'Item não encontrado no destino durante remessa', { item: item.name });
          }
        }

        tx.update(transferRef, {
          status: 'received',
          receivedAt: Date.now(),
          receivedBy: userName,
          hasDivergence,
          receivedQuantities,
          updatedAt: Date.now()
        });

        // Notificação de Divergência para o Proprietário via Inbox Interno
        if (hasDivergence) {
          const enterpriseRef = firebaseService.getDocRef('enterprises', transfer.enterpriseId);
          const entSnap = await tx.get(enterpriseRef);
          const ownerId = entSnap.data()?.ownerId;

          if (ownerId) {
            await CommunicationEngine.sendMessage({
              enterpriseId: transfer.enterpriseId, 
              userId: ownerId,
              senderId: userId,
              senderName: userName,
              title: '🚨 DIVERGÊNCIA DE ESTOQUE',
              content: `Remessa ${transfer.digitalGuideId} finalizada com quebra de carga por ${userName}.\n\nDetalhes:\n${divergenceDetails.join('\n')}`,
              type: 'critical'
            });
          }
        }
      });

      logger.info('inventory', 'Remessa digital recebida e estoque atualizado', { transferId });
    } catch (error) {
      logger.error('inventory', 'Erro ao finalizar transferência', { error });
      throw error;
    }
  }
}