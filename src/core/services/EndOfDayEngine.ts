import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { generateSafeId, formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { InventoryEngine } from './InventoryEngine';

export interface EODChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  required: boolean;
}

export interface DailyShiftLogs {
  morning?: string;
  afternoon?: string;
  night?: string;
}

export interface WastageEntry {
  id: string;
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  sourceType: 'inventory' | 'product';
  cost: number;
  reason: 'expired' | 'damaged' | 'error' | 'other';
}

export interface StaffMealEntry {
  staffId: string;
  staffName: string;
  totalAmount: number;
  authorizedBy: string;
  timestamp: number;
  items: { name: string; quantity: number; cost: number }[];
}

export interface EODSession {
  id: string;
  enterpriseId: string;
  shopId: string;
  dateStr: string; // yyyy-MM-dd
  shiftNumber: number; // Suporte a múltiplos fechamentos (1, 2...)
  status: 'in_progress' | 'completed' | 'audited';
  staffId: string;
  staffName: string;
  checklist: EODChecklistItem[];
  wastage: WastageEntry[];
  staffMeals: StaffMealEntry[];
  logs: DailyShiftLogs;
  financialSummary: {
    expectedCash: number;
    actualCash: number;
    difference: number;
  };
  startedAt: number;
  completedAt?: number;
}

/**
 * EndOfDayEngine - Motor de Fechamento de Dia/Turno
 * Wizard de conformidade operacional e financeira.
 */
export class EndOfDayEngine {
  /**
   * Inicia ou recupera uma sessão de fechamento em andamento.
   */
  static async startSession(enterpriseId: string, shopId: string, staffId: string, staffName: string): Promise<EODSession> {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Busca se já existe um fechamento hoje para determinar o número do turno
    const existing = await firebaseService.getDocsByQuery('eod_sessions', [
      { field: 'shopId', op: '==', value: shopId },
      { field: 'dateStr', op: '==', value: today }
    ]) as EODSession[];

    const inProgress = existing.find(s => s.status === 'in_progress');
    if (inProgress) return inProgress;

    const session: EODSession = {
      id: generateSafeId('eod'),
      enterpriseId,
      shopId,
      dateStr: today,
      shiftNumber: existing.length + 1,
      status: 'in_progress',
      staffId,
      staffName,
      checklist: [
        { id: 'orders_clear', label: 'Pedidos Abertos', description: 'Verificar se não há comandas/mesas sem fechar.', completed: false, required: true },
        { id: 'cash_count', label: 'Conferência de Caixa', description: 'Contar dinheiro físico e comparar com o sistema.', completed: false, required: true },
        { id: 'terminals_sync', label: 'Sincronismo P2P', description: 'Garantir que todos os terminais enviaram os dados.', completed: false, required: true },
        { id: 'inventory_check', label: 'Check de Insumos', description: 'Validar se itens críticos foram baixados corretamente.', completed: false, required: false },
        { id: 'security_lock', label: 'Segurança & Portas', description: 'Verificar trancamento e alarmes da unidade.', completed: false, required: true }
      ],
      wastage: [],
      staffMeals: [],
      logs: {},
      financialSummary: { expectedCash: 0, actualCash: 0, difference: 0 },
      startedAt: Date.now()
    };

    await firebaseService.saveItem('eod_sessions', session.id, session);
    return session;
  }

  /**
   * Registra desperdício de itens e abate o estoque físico imediatamente.
   */
  static async recordWastage(sessionId: string, entry: Omit<WastageEntry, 'id'>) {
    const wastageId = generateSafeId('wast');
    try {
      await firebaseService.runTransaction(async (tx) => {
        const ref = firebaseService.getDocRef('eod_sessions', sessionId);
        const snap = await tx.get(ref);
        const session = snap.data() as EODSession;

        // 1. Abate estoque via InventoryEngine usando a mesma transação (Atômico)
        await InventoryEngine.manualAdjustment(entry.itemId, -entry.quantity, entry.sourceType, tx);

        // 2. Registra na sessão de fechamento
        tx.update(ref, {
          wastage: [...(session.wastage || []), { ...entry, id: wastageId }],
          updatedAt: Date.now()
        });
      });
      logger.info('inventory', 'Desperdício registrado no EOD', { itemId: entry.itemId, qty: entry.quantity });
    } catch (error) {
      logger.error('inventory', 'Falha ao registrar desperdício', { error });
      throw error;
    }
  }

  /**
   * Registra refeição de staff validando limites diários e exigindo PIN de autorização.
   */
  static async recordStaffMeal(sessionId: string, meal: StaffMealEntry, adminPin: string) {
    try {
      await firebaseService.runTransaction(async (tx) => {
        const sessionRef = firebaseService.getDocRef('eod_sessions', sessionId);
        const sessionSnap = await tx.get(sessionRef);
        const session = sessionSnap.data() as EODSession;

        const staffRef = firebaseService.getDocRef('staff', meal.staffId);
        const staffSnap = await tx.get(staffRef);
        const staff = staffSnap.data() as any;

        // Validação de benefício habilitado
        if (!staff.serviceConfig?.staffFood?.enabled) {
          throw new Error('Alimentação de staff não habilitada para este colaborador.');
        }

        // Cálculo de balanço diário (Balanço que "desaparece" ao fechar o dia)
        const spentToday = (session.staffMeals || [])
          .filter(m => m.staffId === meal.staffId)
          .reduce((acc, m) => acc + m.totalAmount, 0);

        const limit = staff.serviceConfig.staffFood.dailyLimit || 0;

        if (spentToday + meal.totalAmount > limit) {
          throw new Error(`Limite diário excedido. Disponível: ${formatCurrency(limit - spentToday)}`);
        }

        // Atualiza a sessão com a nova refeição e o autorizador
        tx.update(sessionRef, {
          staffMeals: [...(session.staffMeals || []), { ...meal, authorizedBy: adminPin, timestamp: Date.now() }],
          updatedAt: Date.now()
        });
      });

      logger.info('hr', 'Refeição de staff autorizada e registrada', { staff: meal.staffName, amount: meal.totalAmount });
    } catch (error) {
      logger.error('hr', 'Erro ao salvar staff meal', { error });
      throw error;
    }
  }

  /**
   * Salva comentários parciais (Feedback de Turno) durante o dia.
   */
  static async saveShiftFeedback(sessionId: string, logs: Partial<DailyShiftLogs>) {
    const updateData: any = { updatedAt: Date.now() };
    if (logs.morning) updateData['logs.morning'] = logs.morning;
    if (logs.afternoon) updateData['logs.afternoon'] = logs.afternoon;
    if (logs.night) updateData['logs.night'] = logs.night;

    await firebaseService.updateItem('eod_sessions', sessionId, {
      ...updateData
    });
    logger.info('system', 'Feedback de turno atualizado', { sessionId });
  }

  /**
   * Valida se existem operações abertas (pedidos/mesas) antes de permitir o fechamento.
   */
  static async validatePendingOperations(enterpriseId: string, shopId: string): Promise<boolean> {
    const pendingOrders = await firebaseService.getDocsByQuery('orders', [
      { field: 'enterpriseId', op: '==', value: enterpriseId },
      { field: 'shopId', op: '==', value: shopId },
      { field: 'status', op: 'in', value: ['pending', 'preparing', 'ready'] }
    ]);
    return pendingOrders.length === 0;
  }

  /**
   * Finaliza o Wizard, valida operações abertas e envia para auditoria.
   */
  static async finalizeEOD(sessionId: string, finalData: Partial<EODSession>) {
    try {
      await firebaseService.runTransaction(async (tx) => {
        const ref = firebaseService.getDocRef('eod_sessions', sessionId);
        const snap = await tx.get(ref);
        const current = snap.data() as EODSession;

        // 1. Trava de Segurança: Exige fechamento de todas as operações
        const isClear = await this.validatePendingOperations(current.enterpriseId, current.shopId);
        if (!isClear) {
          throw new Error('Não é possível fechar o dia: Existem pedidos ou mesas abertas na unidade.');
        }

        const completedAt = Date.now();
        tx.update(ref, {
          ...finalData,
          status: 'completed',
          completedAt,
          updatedAt: completedAt
        });

        // Auditoria: Gera log crítico se houver quebra de caixa
        const diff = finalData.financialSummary?.difference || 0;
        if (Math.abs(diff) > 0.01) {
          await firebaseService.addAuditLog({
            enterpriseId: current.enterpriseId,
            shopId: current.shopId,
            staffId: current.staffId,
            staffName: current.staffName,
            action: 'EOD_CASH_DISCREPANCY',
            details: `Divergência no fechamento do turno ${current.shiftNumber}: R$ ${diff.toFixed(2)}`,
            referenceId: sessionId
          });
        }
      });
      logger.info('system', 'Fechamento de dia concluído e auditado', { sessionId });
    } catch (error) {
      logger.error('system', 'Falha ao finalizar fechamento EOD', { error });
      throw error;
    }
  }

  /**
   * Registra refeição de staff como uma despesa de consumo interno (Desconto no lucro).
   */
  static async recordStaffMealAsExpense(enterpriseId: string, shopId: string, meal: StaffMealEntry) {
    const transactionId = generateSafeId('trans');
    await firebaseService.saveItem('transactions', transactionId, {
      id: transactionId,
      enterpriseId,
      shopId,
      type: 'expense',
      category: 'Staff Food',
      amount: meal.totalAmount,
      description: `Refeição Colaborador: ${meal.staffName}`,
      timestamp: Date.now(),
      isInternalConsumption: true
    });
  }
}