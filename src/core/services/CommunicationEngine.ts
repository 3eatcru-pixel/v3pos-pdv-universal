import { firebaseService } from '../../services/firebaseService';
import { logger } from './logger';

// Adicionado para tipagem consistente
export interface InternalMessage {
  id: string;
  enterpriseId: string;
  companyId?: string;
  userId: string;
  senderId?: string;
  senderName?: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'critical';
  read: boolean;
  timestamp: number;
  readAt?: number;
}

export class CommunicationEngine {
  /**
   * Envia uma mensagem interna (Inbox) para um usuário específico.
   */
  static async sendMessage(params: Omit<InternalMessage, 'id' | 'timestamp' | 'read'>) {
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const message: InternalMessage = {
      ...params,
      id: msgId,
      read: false,
      timestamp: Date.now()
    };

    try {
      await firebaseService.saveItem('user_inbox', msgId, message);
      logger.debug('comm', 'Mensagem enviada', { title: params.title });
      return msgId;
    } catch (error) {
      logger.error('comm', 'Erro ao enviar mensagem', { error });
      throw error;
    }
  }

  /**
   * Marca uma mensagem interna como lida.
   */
  static async markAsRead(messageId: string) {
    await firebaseService.updateItem('user_inbox', messageId, {
      read: true,
      readAt: Date.now()
    });
  }
  
  /**
   * Marca todas as mensagens não lidas de um usuário como lidas.
   * Otimizado para usar query filtrada.
   */
  static async markAllAsRead(enterpriseId: string, userId: string) {
    const unreadMessages = await firebaseService.getDocsByQuery('user_inbox', [
      { field: 'enterpriseId', op: '==', value: enterpriseId },
      { field: 'userId', op: '==', value: userId },
      { field: 'read', op: '==', value: false }
    ]) as InternalMessage[];
    const updates = unreadMessages.map(m => this.markAsRead(m.id));
    await Promise.all(updates);
  }

  static async deleteMessage(messageId: string) {
    await firebaseService.deleteItem('user_inbox', messageId);
  }
  
  /**
   * Envia uma resposta para uma mensagem existente, direcionando ao remetente original
   * ou ao proprietário da empresa se a mensagem for do sistema.
   */
  static async sendReply(enterpriseId: string, originalMsg: InternalMessage, senderId: string, senderName: string, content: string) {
    let recipientId = originalMsg.senderId;
    if (!recipientId) {
      const ent = await firebaseService.getDoc('enterprises', enterpriseId) as any;
      recipientId = ent?.ownerId;
    }
    if (!recipientId) throw new Error('Recipient not found');
    const replyContent = `
      <div style="border-left: 4px solid #3b82f6; padding-left: 15px; margin-bottom: 15px;">
        <p>${content}</p>
      </div>
      <blockquote style="opacity: 0.5; font-size: 0.8em;">
        ${originalMsg.content}
      </blockquote>
    `;
    return this.sendMessage({
      enterpriseId,
      userId: recipientId,
      senderId,
      senderName,
      title: `RE: ${originalMsg.title}`,
      content: replyContent,
      type: 'info'
    });
  }
  
  /**
   * Gera o template visual da Guia de Remessa para o Inbox.
   */
  static getDigitalGuideTemplate(transfer: any): string {
    return `
      <div style="font-family: sans-serif; color: #1e293b;">
        <h2 style="border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">📦 Guia de Remessa Digital</h2>
        <p><b>Protocolo:</b> ${transfer.digitalGuideId}</p>
        <p><b>Origem:</b> ${transfer.sourceShopId.toUpperCase()}</p>
        <div style="background: #f1f5f9; padding: 15px; border-radius: 12px; margin: 15px 0;">
          <h4 style="margin: 0 0 10px 0; font-size: 12px; color: #64748b; text-transform: uppercase;">Itens da Remessa</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${transfer.items.map((i: any) => `<li>${i.quantity}x ${i.name}</li>`).join('')}
          </ul>
        </div>
        <p style="font-size: 10px; color: #94a3b8;">Emitido em ${new Date(transfer.shippedAt).toLocaleString()}</p>
      </div>
    `;
  }
}
