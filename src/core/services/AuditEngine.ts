import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { CommunicationEngine } from './CommunicationEngine';
import { NotificationEngine } from './NotificationEngine';

export interface AuditDivergence {
  type: 'UNAUTHORIZED_STOCK_CHANGE' | 'MISSING_AUDIT_TRAIL' | 'SUSPICIOUS_VOID' | 'ORPHAN_SALE' | 'LABOR_VIOLATION' | 'SYSTEM_OVERRIDE' | 'SERVICE_OVERLAP' | 'RENTAL_VIOLATION' | 'SERVICE_WITHOUT_MATERIAL' | 'LICENSE_EXPIRED' | 'NEGATIVE_STOCK';
  severity: 'high' | 'critical';
  itemId: string;
  itemName: string;
  details: string;
  timestamp: number;
}

/**
 * AuditEngine - Motor de Integridade e Contra-Fraude
 * Responsável por cruzar logs de sistema com o estado real do banco de dados.
 */
export class AuditEngine {
  /**
   * Realiza uma varredura de integridade no estoque e produtos.
   * Detecta mudanças de saldo que não possuem um 'Audit Log' correspondente.
   */
  static async verifyDatabaseIntegrity(enterpriseId: string): Promise<AuditDivergence[]> {
    const divergences: AuditDivergence[] = [];
    
    try {
      logger.info('system', 'Iniciando varredura de integridade de auditoria', { enterpriseId });

      // Otimização: Busca apenas logs das últimas 24h
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      const auditLogs = await firebaseService.getDocsByQuery('audit_logs', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'timestamp', op: '>=', value: twentyFourHoursAgo }
      ]) as any[];
      
      const currentInventory = await firebaseService.getDocsByQuery('inventory', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'updatedAt', op: '>=', value: twentyFourHoursAgo }
      ]) as any[];

      for (const item of currentInventory) {
        // Filtra logs relacionados a este item específico
        const itemLogs = auditLogs.filter(log => log.referenceId === item.id || log.details.includes(item.id));

        // Se o item foi atualizado recentemente (updatedAt), mas não há log de auditoria nas últimas 24h
        // Isso sugere uma manipulação direta no banco de dados ou via console.
        const lastUpdate = item.updatedAt || 0;
        const hasCorrespondingLog = itemLogs.some(log => Math.abs(log.timestamp - lastUpdate) < 5000); // margem de 5s

        if (lastUpdate > 0 && !hasCorrespondingLog) {
          divergences.push({
            type: 'MISSING_AUDIT_TRAIL',
            severity: 'high',
            itemId: item.id,
            itemName: item.name,
            details: `O item sofreu alteração em ${new Date(lastUpdate).toLocaleString()}, mas não existe registro de auditoria assinado para esta ação.`,
            timestamp: Date.now()
          });
        }

        // Auditoria de Saldo Negativo
        if ((item.currentStock || item.stock || 0) < 0) {
          divergences.push({
            type: 'NEGATIVE_STOCK',
            severity: 'high',
            itemId: item.id,
            itemName: item.name,
            details: `Item com saldo negativo detectado: ${item.currentStock || item.stock}. Indica falha na sincronização ou venda de item inexistente.`,
            timestamp: Date.now()
          });
        }
      }

      // 3. Se houver divergências críticas, notifica o proprietário imediatamente via CommunicationEngine
      if (divergences.length > 0) {
        await this.reportDivergences(enterpriseId, divergences);
      }

      return divergences;
    } catch (error) {
      logger.error('system', 'Falha ao executar auditoria de integridade', { error });
      throw error;
    }
  }

  /**
   * Detecta 'Vendas Órfãs': Vendas concluídas que não possuem um registro financeiro 
   * correspondente no PaymentLedger.
   */
  static async detectOrphanSales(enterpriseId: string): Promise<AuditDivergence[]> {
    const divergences: AuditDivergence[] = [];
    
    try {
      logger.info('system', 'Iniciando detecção de vendas órfãs', { enterpriseId });

      // Otimização: Audita apenas os últimos 30 dias para evitar sobrecarga
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const orders = await firebaseService.getDocsByQuery('orders', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'status', op: '==', value: 'delivered' },
        { field: 'closedAt', op: '>=', value: thirtyDaysAgo }
      ]) as any[];
      
      const ledger = await firebaseService.getDocsByQuery('payment_ledger', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'timestamp', op: '>=', value: thirtyDaysAgo }
      ]) as any[];
      const ledgerSaleIds = new Set(ledger.map(t => t.saleId));

      for (const order of orders) {
        // Apenas pedidos entregues/concluídos devem ser auditados para garantir que houve entrada financeira
        if (order.status === 'delivered' && !ledgerSaleIds.has(order.id)) {
          divergences.push({
            type: 'ORPHAN_SALE',
            severity: 'critical',
            itemId: order.id,
            itemName: `Venda ${order.id.slice(-6).toUpperCase()}`,
            details: `Venda concluída no valor de R$ ${order.total.toFixed(2)} não encontrada no livro de pagamentos (PaymentLedger).`,
            timestamp: Date.now()
          });
        }
      }

      if (divergences.length > 0) {
        await this.reportDivergences(enterpriseId, divergences);
      }

      return divergences;
    } catch (error) {
      logger.error('system', 'Falha ao detectar vendas órfãs', { error });
      throw error;
    }
  }

  /**
   * Detecta Serviços sem Material: Alerta quando um serviço técnico (ex: Tattoo) 
   * é finalizado sem nenhum custo de material (CMV) associado.
   */
  static async detectServicesWithoutMaterials(enterpriseId: string): Promise<AuditDivergence[]> {
    const divergences: AuditDivergence[] = [];
    const criticalCategories = ['tattoo', 'piercing', 'quimica', 'coloracao']; // Categorias que DEVEM consumir material
    
    try {
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const orders = await firebaseService.getDocsByQuery('orders', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'status', op: '==', value: 'delivered' },
        { field: 'closedAt', op: '>=', value: thirtyDaysAgo }
      ]) as any[];

      for (const order of orders) {
        const technicalServices = order.items.filter((item: any) => 
          item.type === 'service' && criticalCategories.includes(item.category?.toLowerCase())
        );

        if (technicalServices.length > 0 && (order.totalCost || 0) <= 0) {
          divergences.push({
            type: 'SERVICE_WITHOUT_MATERIAL',
            severity: 'high',
            itemId: order.id,
            itemName: `Venda ${order.id.slice(-6).toUpperCase()}`,
            details: `Serviço técnico realizado por ${order.staffName || 'N/A'} sem baixa de materiais/insumos. Risco de fraude na comissão ou erro de estoque.`,
            timestamp: Date.now()
          });
        }
      }

      if (divergences.length > 0) await this.reportDivergences(enterpriseId, divergences);
      return divergences;
    } catch (error) {
      logger.error('system', 'Falha na auditoria de materiais por serviço', { error });
      return [];
    }
  }

  /**
   * Audit de Jornada de Trabalho (Compliance Internacional)
   * Verifica excesso de horas semanais com base no país da unidade.
   */
  static async detectLaborViolations(enterpriseId: string, countryCode: string): Promise<AuditDivergence[]> {
    const divergences: AuditDivergence[] = [];
    const maxHours = countryCode === 'PT' ? 40 : countryCode === 'UK' ? 48 : 40;
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    try {
      const shifts = await firebaseService.getDocsByQuery('shifts', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'startTime', op: '>=', value: sevenDaysAgo }
      ]) as any[];
      
      const staff = await firebaseService.getDocsByQuery('staff', [
        { field: 'enterpriseId', op: '==', value: enterpriseId }
      ]) as any[];

      staff.forEach(member => {
        // Auditoria Inteligente: Parceiros de aluguel de espaço não possuem controle de jornada CLT
        if (member.businessModel === 'rental' || member.businessModel === 'freelancer') return;

        const memberShifts = shifts.filter(s => s.staffId === member.id);
        const totalMs = memberShifts.reduce((acc, s) => acc + (s.endTime - s.startTime), 0);
        const totalHours = totalMs / (1000 * 60 * 60);

        if (totalHours > maxHours) {
          divergences.push({
            type: 'LABOR_VIOLATION',
            severity: 'high',
            itemId: member.id,
            itemName: member.name,
            details: `Risco de Hora Extra/Processo: ${totalHours.toFixed(1)}h acumuladas. Limite regional (${countryCode}): ${maxHours}h.`,
            timestamp: Date.now()
          });
        }
      });

      if (divergences.length > 0) {
        await this.reportDivergences(enterpriseId, divergences);
      }
      return divergences;
    } catch (error) {
      logger.error('system', 'Falha na auditoria trabalhista', { error });
      return [];
    }
  }

  /**
   * Detecta Licenças Profissionais Vencidas (Opcional/Alerta)
   * Verifica se profissionais de saúde ou tattoo estão operando com licenças expiradas.
   */
  static async detectLicenseExpirations(enterpriseId: string): Promise<AuditDivergence[]> {
    const divergences: AuditDivergence[] = [];
    const now = Date.now();

    try {
      const staff = await firebaseService.getDocsByQuery('staff', [
        { field: 'enterpriseId', op: '==', value: enterpriseId },
        { field: 'active', op: '==', value: true }
      ]) as any[];

      for (const member of staff) {
        const expiry = member.licenseExpiry || 0;
        
        if (expiry > 0 && expiry < now) {
          divergences.push({
            type: 'LICENSE_EXPIRED',
            severity: 'high', // Tratado como aviso (opcional) conforme solicitado
            itemId: member.id,
            itemName: member.name,
            details: `A licença profissional (${member.professionalLicense || 'N/A'}) expirou em ${new Date(expiry).toLocaleDateString()}.`,
            timestamp: Date.now()
          });
        }
      }

      if (divergences.length > 0) await this.reportDivergences(enterpriseId, divergences);
      return divergences;
    } catch (error) {
      logger.error('system', 'Falha na auditoria de licenças', { error });
      return [];
    }
  }

  /**
   * Notifica o dono da empresa sobre atividades suspeitas detectadas.
   */
  private static async reportDivergences(enterpriseId: string, divergences: AuditDivergence[]) {
    const enterprise = await firebaseService.getDoc('enterprises', enterpriseId) as any;
    const ownerId = enterprise?.ownerId;

    if (!ownerId) return;

    // Auditoria: Delegado ao NotificationEngine para consolidação em lotes por hora
    await NotificationEngine.enqueueDivergences(enterpriseId, divergences);
    logger.info('system', 'Divergências enviadas para fila de consolidação horária', { enterpriseId, count: divergences.length });
  }
}