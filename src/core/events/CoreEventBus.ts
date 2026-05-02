import { EventBus } from '../../engine/mesh/EventBus';
import { CoreProduct, CoreSale, SyncEvent } from '../types';

export type CoreEvents = {
  'product:updated': CoreProduct;
  'product:stock_decremented': { productId: string; quantity: number; saleId?: string };
  'product:stock_incremented': { productId: string; quantity: number };
  'sale:created': CoreSale;
  'sale:updated': any;
  'order:created': any;
  'order:updated': any;
  'inventory:updated': any;
  'inventory:reconciled': { id: string; stock: number };
  'hr:schedule_published': any;
  'hr:staff_updated': { enterpriseId: string; staffId: string; role: string };
  'system:latency_update': any;
  'system:cloud_recommendation': any;
  'sync:needed': SyncEvent;
  'system:sync_prediction': { nextSync: number; pendingCount: number; nextExpectedAt?: number };
  'system:sync_status': { status: 'synced' | 'failed' | 'pending' | 'offline'; lastSync: number; error?: string };
  'local:p2p_stock_notification': { productId: string; quantity: number; type?: string };
  'local:p2p_sale_notification': any;
  'marketing:google_menu_synced': { shopId: string; syncId: string; driveFileId: string };
  'system:error': { message: string; code?: string; data?: any };
};

/**
 * Central dispatcher for all core events.
 * Decouples storage from synchronization engines.
 */
export const coreEventBus = new EventBus<CoreEvents>();
