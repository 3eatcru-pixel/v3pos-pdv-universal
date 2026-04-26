import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { generateSafeId } from '../lib/utils';
import { InventoryEngine } from './InventoryEngine';

export interface BottleCredit {
  id: string;
  customerId: string;
  enterpriseId: string;
  shopId: string;
  bottleType: string; // SKU ou ID do item vasilhame vazio
  quantity: number;
  unitValue: number;
  totalValue: number;
  status: 'available' | 'used' | 'expired';
  createdAt: number;
  usedAt?: number;
  saleId?: string;
}

/**
 * EmptyBottleEngine - Motor de Gestão de Vasilhames e Logística Reversa
 * Controla a entrada de garrafas vazias e a geração de créditos para abatimento em novas compras.
 */
export class EmptyBottleEngine {
  /**
   * Registra a devolução de vasilhames e gera crédito imediato para o cliente.
   */
  static async recordReturn(params: {
    enterpriseId: string;
    shopId: string;
    customerId: string;
    bottleItemId: string;
    bottleName: string;
    quantity: number;
    unitValue: number;
  }) {
    const creditId = generateSafeId('credit');
    const totalValue = params.quantity * params.unitValue;

    try {
      await firebaseService.runTransaction(async (tx) => {
        // 1. Aumenta o estoque de vasilhames vazios (Ativo da loja)
        await InventoryEngine.manualAdjustment(params.bottleItemId, params.quantity, 'inventory', tx);

        // 2. Cria o registro de crédito vinculado ao cliente
        const creditRef = firebaseService.getDocRef('bottle_credits', creditId);
        const credit: BottleCredit = {
          id: creditId,
          customerId: params.customerId,
          enterpriseId: params.enterpriseId,
          shopId: params.shopId,
          bottleType: params.bottleItemId,
          quantity: params.quantity,
          unitValue: params.unitValue,
          totalValue,
          status: 'available',
          createdAt: Date.now()
        };
        tx.set(creditRef, credit);

        // 3. Log de Auditoria
        const auditId = generateSafeId('audit');
        tx.set(firebaseService.getDocRef('audit_logs', auditId), {
          enterpriseId: params.enterpriseId,
          shopId: params.shopId,
          action: 'BOTTLE_RETURN',
          details: `Cliente ${params.customerId} devolveu ${params.quantity}x ${params.bottleName}. Crédito: R$ ${totalValue.toFixed(2)}`,
          timestamp: Date.now()
        });
      });

      logger.info('inventory', 'Retorno de vasilhame processado', { customerId: params.customerId, totalValue });
      return creditId;
    } catch (error) {
      logger.error('inventory', 'Erro ao processar retorno de vasilhame', { error });
      throw error;
    }
  }

  /**
   * Busca créditos disponíveis para um cliente.
   */
  static async getAvailableCredits(enterpriseId: string, customerId: string): Promise<BottleCredit[]> {
    const credits = await firebaseService.getDocsByQuery('bottle_credits', [
      { field: 'enterpriseId', op: '==', value: enterpriseId },
      { field: 'customerId', op: '==', value: customerId },
      { field: 'status', op: '==', value: 'available' }
    ]) as BottleCredit[];

    return credits;
  }
}