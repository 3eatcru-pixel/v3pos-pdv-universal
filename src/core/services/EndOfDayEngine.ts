import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { generateSafeId, formatCurrency } from '../lib/utils';
import { format, startOfDay } from 'date-fns';
import { InventoryEngine } from './InventoryEngine';
import { HREngine } from './HREngine';
import { FinanceEngine } from './FinanceEngine';
import { GoogleBusinessEngine } from './GoogleBusinessEngine';

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
  items: { id?: string; name: string; quantity: number; cost: number }[];
}

export interface EODSession {
  id: string;
  enterpriseId: string;
  shopId: string;
  dateStr: string; // yyyy-MM-dd
  shiftNumber: number; // Suporte a múltiplos fechamentos (1, 2...)
  status: 'in_progress' | 'completed' | 'audited' | 'pending_closure';
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
    expectedCard: number;
    actualCard: number;
    expectedPix: number;
    actualPix: number;
    expectedFiado: number;
    totalRevenue: number;
  };
  startedAt: number;
  completedAt?: number;
  midShiftSyncDone?: boolean; // Auditoria: Controla o push parcial de 5h
  debtPaymentsTotal: number; // Requisito: Total de fiado recebido (pago) no dia
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
      financialSummary: { 
        expectedCash: 0, 
        actualCash: 0, 
        difference: 0,
        expectedCard: 0,
        actualCard: 0,
        expectedPix: 0,
        actualPix: 0,
        expectedFiado: 0,
        totalRevenue: 0
      },
      startedAt: Date.now(),
      midShiftSyncDone: false,
      debtPaymentsTotal: 0
    };

    await firebaseService.saveItem('eod_sessions', session.id, session);

    // Marketing Sync: Atualiza o Google Business para status Online/Aberto
    await GoogleBusinessEngine.updateBusinessStatus(enterpriseId, shopId, true);

    return session;
  }

  /**
   * Calcula os valores financeiros esperados para a sessão baseados nas vendas do período.
   * Crucial para a integração com o FinanceEngine.
   */
  static async calculateFinancialExpectations(enterpriseId: string, shopId: string, startedAt: number) {
    const orders = await firebaseService.getDocsByQuery('orders', [
      { field: 'enterpriseId', op: '==', value: enterpriseId },
      { field: 'shopId', op: '==', value: shopId },
      { field: 'status', op: '==', value: 'delivered' },
      { field: 'closedAt', op: '>=', value: startedAt }
    ]);

    const expectations = {
      cash: 0,
      card: 0,
      pix: 0,
      fiado: 0,
      total: 0
    };

    orders.forEach((o: any) => {
      expectations.total += o.total;
      if (o.paymentMethod === 'cash') expectations.cash += o.total;
      else if (o.paymentMethod === 'card') expectations.card += o.total;
      else if (o.paymentMethod === 'pix') expectations.pix += o.total;
      else if (o.paymentMethod === 'fiado') expectations.fiado += o.total;
      
      // Trata pagamentos parciais/split se existirem
      if (o.payments) {
        o.payments.forEach((p: any) => {
          if (p.method === 'cash') expectations.cash += p.amount;
          else if (p.method === 'card') expectations.card += p.amount;
          else if (p.method === 'pix') expectations.pix += p.amount;
        });
      }
    });

    return expectations;
  }

  /**
   * Salva a sessão atual como 'Pendente de Fechamento' (Fechamento Parcial).
   * Permite que o sistema inicie um novo turno imediatamente enquanto este fechamento
   * fica aguardando conferência ou solução de problemas pelo próximo gerente.
   */
  static async saveAsPendingClosure(sessionId: string) {
    try {
      await firebaseService.updateItem('eod_sessions', sessionId, {
        status: 'pending_closure',
        updatedAt: Date.now()
      });
      
      logger.warn('system', 'Fechamento movido para o estado PENDENTE. Novo turno liberado.', { sessionId });

      // Auditoria Eco-Mode: Push parcial para o proprietário ter visibilidade imediata dos dados travados
      const snap = await firebaseService.getDoc('eod_sessions', sessionId) as EODSession;
      if (snap) await this.syncFinalSummaryToCloud(snap.enterpriseId, snap.shopId, true);
    } catch (error) {
      logger.error('system', 'Erro ao suspender sessão de fechamento', { error });
      throw error;
    }
  }

  /**
   * Realiza um push parcial para o Firestore 5 horas após a abertura.
   * Permite que o dono veja o progresso sem gastar units a cada venda.
   */
  static async checkAndTriggerMidShiftSync(sessionId: string) {
    try {
      const ref = firebaseService.getDocRef('eod_sessions', sessionId);
      const snap = await firebaseService.getDoc('eod_sessions', sessionId) as EODSession;
      
      if (!snap || snap.status !== 'in_progress') return;
      
      const fiveHoursInMs = 5 * 60 * 60 * 1000;
      const now = Date.now();

      if (!snap.midShiftSyncDone && (now - snap.startedAt >= fiveHoursInMs)) {
        logger.info('system', '⚡️ Gatilho de 5h atingido. Iniciando Push Consolidado parcial.');
        
        await this.syncFinalSummaryToCloud(snap.enterpriseId, snap.shopId, true);
        
        await firebaseService.updateItem('eod_sessions', sessionId, {
          midShiftSyncDone: true,
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      logger.error('system', 'Falha na checagem de mid-shift sync', { error });
    }
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
        const sourceCollection = entry.sourceType === 'product' ? 'products' : 'inventory';
        await InventoryEngine.manualAdjustment(entry.itemId, -entry.quantity, sourceCollection, tx);

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

        // Auditoria CMV: Abate os ingredientes da refeição do estoque físico
        for (const item of meal.items) {
           await InventoryEngine.manualAdjustment(item.id || '', -item.quantity, 'inventory', tx);
        }
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
      let sessionSnapshot: EODSession | null = null;
      await firebaseService.runTransaction(async (tx) => {
        const ref = firebaseService.getDocRef('eod_sessions', sessionId);
        const snap = await tx.get(ref);
        const current = snap.data() as EODSession;
        sessionSnapshot = current;

        // 1. Trava de Segurança: Exige fechamento de todas as operações
        const isClear = await this.validatePendingOperations(current.enterpriseId, current.shopId);
        if (!isClear) {
          throw new Error('Não é possível fechar o dia: Existem pedidos ou mesas abertas na unidade.');
        }

        // 1.5 Auditoria HR: Aplica mudanças de cargo/perfil que estavam na fila
        await HREngine.applyPendingUpdates(current.enterpriseId);

        // 1.6 Marketing Sync: Atualiza o Google Business para status Offline/Fechado
        await GoogleBusinessEngine.updateBusinessStatus(current.enterpriseId, current.shopId, false);

        const completedAt = Date.now();
        tx.update(ref, {
          ...finalData,
          status: 'completed',
          completedAt,
          updatedAt: completedAt
        });

        // INTEGRAÇÃO FINANCEIRA: Registra a quebra de caixa no Ledger
        const diff = finalData.financialSummary?.difference || 0;
        if (Math.abs(diff) > 0.01) {
          // Cria transação de ajuste no FinanceEngine
          const adjType = diff < 0 ? 'expense' : 'income';
          const adjCategory = 'Ajuste de Caixa (EOD)';
          
          await FinanceEngine.createTransaction({
            enterpriseId: current.enterpriseId,
            shopId: current.shopId,
            module: 'generic',
            staffId: current.staffId,
            staffName: current.staffName,
            type: adjType,
            amount: Math.abs(diff),
            category: adjCategory,
            description: `Ajuste automático por quebra de caixa no turno ${current.shiftNumber}. Diferença apurada: R$ ${diff.toFixed(2)}`,
            referenceId: sessionId
          });

          // Auditoria: Gera log crítico
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

      // Auditoria Eco-Mode: Após o fechamento, dispara o Push Consolidado para a Nuvem
      if (sessionSnapshot) {
        await EndOfDayEngine.syncFinalSummaryToCloud(sessionSnapshot.enterpriseId, sessionSnapshot.shopId);
      }
    } catch (error) {
      logger.error('system', 'Falha ao finalizar fechamento EOD', { error });
      throw error;
    }
  }

  /**
   * Realiza o Push Consolidado (Eco-Mode).
   * Agrega todas as vendas locais do dia e envia um resumo único para o Firestore.
   * Economiza centenas de Cloud Units ao evitar o sync por venda.
   */
  static async syncFinalSummaryToCloud(enterpriseId: string, shopId: string, isPartial: boolean = false) {
    try {
      logger.info('system', `🍃 Gerando Push Consolidado ${isPartial ? 'PARCIAL (5h)' : 'FINAL'} para o Proprietário...`, { shopId });

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const startOfToday = startOfDay(new Date()).getTime();

      // 1. Busca ordens e recebimentos de dívidas
      const [localOrders, debtPayments] = await Promise.all([
        firebaseService.getDocsByQuery('orders', [
          { field: 'enterpriseId', op: '==', value: enterpriseId },
          { field: 'shopId', op: '==', value: shopId },
          { field: 'status', op: '==', value: 'delivered' },
          { field: 'closedAt', op: '>=', value: startOfToday }
        ]),
        firebaseService.getDocsByQuery('transactions', [
          { field: 'enterpriseId', op: '==', value: enterpriseId },
          { field: 'shopId', op: '==', value: shopId },
          { field: 'category', op: '==', value: 'Debt Payment' },
          { field: 'timestamp', op: '>=', value: startOfToday }
        ])
      ]) as [any[], any[]];

      const totalRevenue = localOrders.reduce((acc, o) => acc + o.total, 0);
      const totalDebtPaid = debtPayments.reduce((acc, t) => acc + t.amount, 0);
      const totalOnCreditIssued = localOrders.filter(o => o.paymentMethod === 'fiado').reduce((acc, o) => acc + o.total, 0);

      const categoryMap: Record<string, number> = {};
      localOrders.forEach(o => {
        (o.items || []).forEach((i: any) => {
          const cat = i.category || 'Geral';
          categoryMap[cat] = (categoryMap[cat] || 0) + (i.totalPrice || (i.price * i.quantity));
        });
      });

      // Envia o resumo atômico (Custo: 1 transação / 2 units)
      await firebaseService.saveItem('daily_consolidated_summaries', `${shopId}_${todayStr}`, {
        enterpriseId,
        shopId,
        date: todayStr,
        revenue: totalRevenue + totalDebtPaid, // Receita total inclui dívidas pagas
        salesOnly: totalRevenue,
        debtPayments: totalDebtPaid,
        newDebtsIssued: totalOnCreditIssued,
        orderCount: localOrders.length,
        categoryBreakdown: categoryMap,
        syncedAt: Date.now(),
        isEcoMode: true,
        isPartial
      });

      logger.info('system', '✅ Push Consolidado enviado com sucesso.');
    } catch (error) {
      logger.error('system', 'Falha no processamento do Push Consolidado', { error });
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
