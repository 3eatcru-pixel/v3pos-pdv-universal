import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';
import { CommunicationEngine } from './CommunicationEngine';
import { AuditDivergence } from './AuditEngine';
import { accountService } from './accountService';

/**
 * NotificationEngine - Motor de Consolidação de Alertas
 * Agrupa notificações de auditoria em lotes temporais para evitar excesso de mensagens.
 */
export class NotificationEngine {
  private static BATCH_INTERVAL_MS = 60 * 60 * 1000; // 1 Hora

  /**
   * Adiciona divergências à fila de notificação e verifica se é hora de processar o lote.
   */
  static async enqueueDivergences(enterpriseId: string, divergences: AuditDivergence[]) {
    try {
      // 1. Salva cada divergência na fila persistente (Firestore)
      const savePromises = divergences.map(d => 
        firebaseService.addItem('audit_notification_queue', {
          ...d,
          enterpriseId,
          queuedAt: Date.now()
        })
      );
      await Promise.all(savePromises);

      // 2. Verifica se deve processar o lote agora
      await this.processBatchIfReady(enterpriseId);
    } catch (error) {
      logger.error('system', 'Falha ao enfileirar notificações de auditoria', { error });
    }
  }

  /**
   * Processa a fila se o intervalo de 1 hora tiver sido atingido desde o último envio.
   */
  private static async processBatchIfReady(enterpriseId: string) {
    const stateDocId = `state_${enterpriseId}`;
    
    try {
      const state = await firebaseService.getDoc('notification_states', stateDocId) as any;
      const lastBatchAt = state?.lastBatchAt || 0;
      const now = Date.now();

      if (now - lastBatchAt >= this.BATCH_INTERVAL_MS) {
        await this.sendConsolidatedBatch(enterpriseId);
        await firebaseService.saveItem('notification_states', stateDocId, { lastBatchAt: now });
      }
    } catch (error) {
      logger.error('system', 'Erro ao processar lote de notificações', { error });
    }
  }

  /**
   * Consolida todos os alertas pendentes em uma única mensagem via CommunicationEngine.
   */
  private static async sendConsolidatedBatch(enterpriseId: string) {
    const company = await accountService.getCompanyById(enterpriseId);
    if (!company?.ownerId) return;

    // Busca itens na fila
    const queue = await firebaseService.getDocsByQuery('audit_notification_queue', [
      { field: 'enterpriseId', op: '==', value: enterpriseId }
    ]) as any[];

    if (queue.length === 0) return;

    const criticalCount = queue.filter(d => d.severity === 'critical').length;
    const title = `📊 RESUMO DE AUDITORIA: ${queue.length} Ocorrências`;

    const content = `
      <div style="font-family: sans-serif; color: #1e293b;">
        <h2 style="text-transform: uppercase; italic; font-weight: 900; color: #0f172a; border-bottom: 3px solid #3b82f6; padding-bottom: 10px;">
          Relatório de Integridade Horário
        </h2>
        <p>Foram detectadas <b>${queue.length}</b> divergências na última hora.</p>
        
        <div style="background: #f8fafc; border-radius: 16px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="text-align: left; color: #64748b; text-transform: uppercase;">
                <th style="padding: 8px;">Severidade</th>
                <th style="padding: 8px;">Tipo</th>
                <th style="padding: 8px;">Item / Detalhes</th>
              </tr>
            </thead>
            <tbody>
              ${queue.map(d => `
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="padding: 8px; font-weight: bold; color: ${d.severity === 'critical' ? '#e11d48' : '#f59e0b'}">${d.severity.toUpperCase()}</td>
                  <td style="padding: 8px; font-weight: bold;">${d.type}</td>
                  <td style="padding: 8px;"><b>${d.itemName}</b><br/>${d.details}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <p style="font-size: 10px; color: #94a3b8;">Lote processado em ${new Date().toLocaleString()}</p>
      </div>
    `;

    await CommunicationEngine.sendMessage({
      enterpriseId,
      userId: company.ownerId,
      title,
      content,
      type: criticalCount > 0 ? 'critical' : 'warning'
    });

    // Limpa a fila após o envio bem-sucedido
    const deletePromises = queue.map(item => firebaseService.deleteItem('audit_notification_queue', item.id));
    await Promise.all(deletePromises);
    logger.info('system', 'Lote de notificações enviado e fila limpa', { count: queue.length });
  }
}