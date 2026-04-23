import { EventBus } from '../../engine/mesh/EventBus';
import { CoreProduct, CoreSale, SyncEvent } from '../types';

export type CoreEvents = {
  'product:updated': CoreProduct;
  'product:stock_decremented': { productId: string; quantity: number };
  'sale:created': CoreSale;
  'order:created': any;
  'order:updated': any;
  'inventory:updated': any;
  'sync:needed': SyncEvent;
  'system:error': { message: string; code?: string; data?: any };
};

/**
 * Central dispatcher for all core events.
 * Decouples storage from synchronization engines.
 */
export const coreEventBus = new EventBus<CoreEvents>();
