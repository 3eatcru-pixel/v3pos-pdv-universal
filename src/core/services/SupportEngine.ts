import { firebaseService } from '../../services/firebaseService';
import { SupportMessage, User } from '../types';

export class SupportEngine {
  static async sendMessage(user: User, message: string) {
    const msg = {
      companyId: user.companyId || '',
      message,
      timestamp: Date.now(),
      status: 'open',
      userName: user.name,
      userEmail: user.email
    };
    return firebaseService.addItem('support_messages', msg);
  }

  static async replyMessage(adminUser: User, messageId: string, reply: string) {
    if (adminUser.role !== 'dev') throw new Error('Acesso negado.');

    return firebaseService.updateItem('support_messages', messageId, {
      reply,
      repliedAt: Date.now(),
      repliedBy: adminUser.name,
      status: 'resolved'
    });
  }

  static async fetchMessages(companyId?: string): Promise<SupportMessage[]> {
    return firebaseService.getAllDocs('support_messages', companyId) as Promise<SupportMessage[]>;
  }
}