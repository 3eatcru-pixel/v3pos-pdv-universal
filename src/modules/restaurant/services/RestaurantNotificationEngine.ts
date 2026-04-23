import { firebaseService } from '../../../services/firebaseService';

interface EmitStationNotificationInput {
  enterpriseId: string;
  shopId: string;
  title: string;
  message: string;
  type: string;
  tableId?: string;
}

export class RestaurantNotificationEngine {
  static async emit(input: EmitStationNotificationInput): Promise<void> {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await firebaseService.saveItem('notifications', id, {
      id,
      title: input.title,
      message: input.message,
      timestamp: Date.now(),
      read: false,
      type: input.type,
      companyId: input.enterpriseId,
      enterpriseId: input.enterpriseId,
      shopId: input.shopId,
      tableId: input.tableId,
    } as any);
  }
}
