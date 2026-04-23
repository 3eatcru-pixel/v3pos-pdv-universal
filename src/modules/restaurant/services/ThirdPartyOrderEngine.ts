import { firebaseService } from '../../../services/firebaseService';
import type {
  Order,
  OrderItem,
  ThirdPartyOrder,
  ThirdPartyOrderItem,
  ThirdPartyProvider,
  ThirdPartyProviderConfig,
} from '../../../types';

interface SaveProviderConfigInput {
  enterpriseId: string;
  shopId: string;
  userId: string;
  provider: ThirdPartyProvider;
  enabled: boolean;
  merchantId?: string;
  storeId?: string;
  clientId?: string;
  clientSecret?: string;
  webhookSecret?: string;
  pollingEnabled?: boolean;
  notes?: string;
}

interface IngestThirdPartyOrderInput {
  enterpriseId: string;
  shopId: string;
  userId: string;
  provider: ThirdPartyProvider;
  payload: string;
}

interface AcceptThirdPartyOrderInput {
  thirdPartyOrder: ThirdPartyOrder;
  staffId: string;
}

interface RejectThirdPartyOrderInput {
  thirdPartyOrder: ThirdPartyOrder;
  staffId: string;
  reason: string;
}

const PROVIDER_DOC_PREFIX: Record<ThirdPartyProvider, string> = {
  ifood: 'ifood',
  uber_eats: 'uber',
  google_ordering: 'google',
  rappi: 'rappi',
  other: 'other',
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null) return null;
  return value as Record<string, unknown>;
};

const asArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  return [];
};

const asString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  if (typeof value === 'number') return String(value);
  return undefined;
};

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const normalizeUnixSeconds = (value: unknown): number | undefined => {
  const num = asNumber(value);
  if (num === undefined) return undefined;
  if (num > 9999999999) return Math.trunc(num);
  return Math.trunc(num * 1000);
};

const buildOrderItems = (itemsRaw: unknown): ThirdPartyOrderItem[] => {
  const sourceItems = asArray(itemsRaw);
  return sourceItems
    .map((itemRaw, index): ThirdPartyOrderItem | null => {
      const item = asRecord(itemRaw);
      if (!item) return null;

      const name =
        asString(item.name) ||
        asString(item.title) ||
        asString(item.displayName) ||
        `Item ${index + 1}`;
      const quantity = asNumber(item.quantity) ?? 1;
      const unitPrice =
        asNumber(item.unitPrice) ??
        asNumber(item.price) ??
        asNumber(item.unit_value) ??
        0;

      return {
        id: `tp-item-${Date.now()}-${index}`,
        externalItemId: asString(item.id) || asString(item.externalId) || asString(item.sku),
        name,
        quantity: Math.max(1, quantity),
        unitPrice: Math.max(0, unitPrice),
        notes: asString(item.notes) || asString(item.observations) || asString(item.specialInstructions),
      };
    })
    .filter((item): item is ThirdPartyOrderItem => item !== null);
};

const normalizeIfoodPayload = (
  payload: Record<string, unknown>,
  input: IngestThirdPartyOrderInput,
): Omit<ThirdPartyOrder, 'id' | 'status' | 'receivedAt'> => {
  const orderRoot = asRecord(payload.order) || payload;
  const customer = asRecord(orderRoot.customer) || asRecord(orderRoot.customerInfo);
  const items = buildOrderItems(orderRoot.items);
  const subtotal = asNumber(orderRoot.subtotal) ?? items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const deliveryFee = asNumber(orderRoot.deliveryFee) ?? asNumber(orderRoot.delivery_fee) ?? 0;
  const total = asNumber(orderRoot.total) ?? subtotal + deliveryFee;

  return {
    enterpriseId: input.enterpriseId,
    shopId: input.shopId,
    userId: input.userId,
    provider: input.provider,
    externalOrderId:
      asString(orderRoot.id) ||
      asString(orderRoot.orderId) ||
      `ifood-${Date.now()}`,
    sourceCreatedAt: normalizeUnixSeconds(orderRoot.createdAt) || normalizeUnixSeconds(orderRoot.created_at),
    customerName: asString(customer?.name) || asString(orderRoot.customerName),
    customerPhone: asString(customer?.phone) || asString(orderRoot.customerPhone),
    items,
    subtotal,
    deliveryFee,
    total,
    rawPayload: JSON.stringify(payload),
  };
};

const normalizeUberPayload = (
  payload: Record<string, unknown>,
  input: IngestThirdPartyOrderInput,
): Omit<ThirdPartyOrder, 'id' | 'status' | 'receivedAt'> => {
  const meta = asRecord(payload.meta) || {};
  const order = asRecord(meta.order) || asRecord(payload.order) || {};
  const eater = asRecord(order.eater) || asRecord(payload.eater);
  const items = buildOrderItems(order.items || payload.items);
  const subtotal = asNumber(order.subtotal) ?? items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const deliveryFee = asNumber(order.delivery_fee) ?? asNumber(order.deliveryFee) ?? 0;
  const total = asNumber(order.total) ?? subtotal + deliveryFee;

  return {
    enterpriseId: input.enterpriseId,
    shopId: input.shopId,
    userId: input.userId,
    provider: input.provider,
    externalOrderId:
      asString(meta.resource_id) ||
      asString(order.id) ||
      asString(payload.resource_id) ||
      `uber-${Date.now()}`,
    sourceCreatedAt: normalizeUnixSeconds(payload.event_time) || normalizeUnixSeconds(order.created_at),
    customerName: asString(eater?.first_name) || asString(eater?.name),
    customerPhone: asString(eater?.phone),
    items,
    subtotal,
    deliveryFee,
    total,
    rawPayload: JSON.stringify(payload),
  };
};

const normalizeGooglePayload = (
  payload: Record<string, unknown>,
  input: IngestThirdPartyOrderInput,
): Omit<ThirdPartyOrder, 'id' | 'status' | 'receivedAt'> => {
  const order = asRecord(payload.order) || payload;
  const customer = asRecord(order.customer);
  const items = buildOrderItems(order.items);
  const subtotal = asNumber(order.subtotal) ?? items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const deliveryFee = asNumber(order.deliveryFee) ?? 0;
  const total = asNumber(order.total) ?? subtotal + deliveryFee;

  return {
    enterpriseId: input.enterpriseId,
    shopId: input.shopId,
    userId: input.userId,
    provider: input.provider,
    externalOrderId:
      asString(order.id) ||
      asString(order.orderId) ||
      `google-${Date.now()}`,
    sourceCreatedAt: normalizeUnixSeconds(order.createdAt),
    customerName: asString(customer?.name),
    customerPhone: asString(customer?.phone),
    items,
    subtotal,
    deliveryFee,
    total,
    rawPayload: JSON.stringify(payload),
  };
};

const normalizeFallbackPayload = (
  payload: Record<string, unknown>,
  input: IngestThirdPartyOrderInput,
): Omit<ThirdPartyOrder, 'id' | 'status' | 'receivedAt'> => {
  const items = buildOrderItems(payload.items);
  const subtotal = asNumber(payload.subtotal) ?? items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const deliveryFee = asNumber(payload.deliveryFee) ?? 0;
  const total = asNumber(payload.total) ?? subtotal + deliveryFee;

  return {
    enterpriseId: input.enterpriseId,
    shopId: input.shopId,
    userId: input.userId,
    provider: input.provider,
    externalOrderId: asString(payload.id) || asString(payload.orderId) || `external-${Date.now()}`,
    sourceCreatedAt: normalizeUnixSeconds(payload.createdAt),
    customerName: asString(payload.customerName),
    customerPhone: asString(payload.customerPhone),
    items,
    subtotal,
    deliveryFee,
    total,
    rawPayload: JSON.stringify(payload),
  };
};

export class ThirdPartyOrderEngine {
  static async listProviderConfigs(
    enterpriseId: string,
    shopId: string,
    userId: string,
  ): Promise<ThirdPartyProviderConfig[]> {
    const all = await firebaseService.getAllDocs('thirdPartyProviderConfigs', enterpriseId, shopId);
    return (all as ThirdPartyProviderConfig[])
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static async saveProviderConfig(input: SaveProviderConfigInput): Promise<ThirdPartyProviderConfig> {
    const configId = `tp-config-${PROVIDER_DOC_PREFIX[input.provider]}-${input.enterpriseId}-${input.shopId}-${input.userId}`;
    const payload: ThirdPartyProviderConfig = {
      id: configId,
      enterpriseId: input.enterpriseId,
      shopId: input.shopId,
      userId: input.userId,
      provider: input.provider,
      enabled: input.enabled,
      merchantId: input.merchantId?.trim() || undefined,
      storeId: input.storeId?.trim() || undefined,
      clientId: input.clientId?.trim() || undefined,
      clientSecret: input.clientSecret?.trim() || undefined,
      webhookSecret: input.webhookSecret?.trim() || undefined,
      pollingEnabled: Boolean(input.pollingEnabled),
      notes: input.notes?.trim() || undefined,
      updatedAt: Date.now(),
    };

    await firebaseService.saveItem('thirdPartyProviderConfigs', configId, payload);
    return payload;
  }

  static normalizePayload(input: IngestThirdPartyOrderInput, payload: Record<string, unknown>): Omit<ThirdPartyOrder, 'id' | 'status' | 'receivedAt'> {
    if (input.provider === 'ifood') return normalizeIfoodPayload(payload, input);
    if (input.provider === 'uber_eats') return normalizeUberPayload(payload, input);
    if (input.provider === 'google_ordering') return normalizeGooglePayload(payload, input);
    return normalizeFallbackPayload(payload, input);
  }

  static async ingestOrder(input: IngestThirdPartyOrderInput): Promise<ThirdPartyOrder> {
    const parsed = JSON.parse(input.payload) as unknown;
    const payloadRecord = asRecord(parsed);
    if (!payloadRecord) {
      throw new Error('Payload inválido. Informe um JSON de objeto.');
    }

    const normalized = this.normalizePayload(input, payloadRecord);
    const id = `tp-order-${input.provider}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const thirdPartyOrder: ThirdPartyOrder = {
      id,
      status: 'received',
      receivedAt: Date.now(),
      ...normalized,
    };

    await firebaseService.saveItem('thirdPartyOrders', id, thirdPartyOrder);
    return thirdPartyOrder;
  }

  private static toInternalOrderItems(items: ThirdPartyOrderItem[]): OrderItem[] {
    return items.map((item, index) => ({
      id: `internal-item-${Date.now()}-${index}`,
      productId: item.externalItemId || `external-${index}`,
      name: item.name,
      category: 'Delivery',
      price: item.unitPrice,
      quantity: item.quantity,
      notes: item.notes,
      status: 'pending',
      sentToKitchen: false,
      modifiers: [],
    }));
  }

  static async acceptOrder(input: AcceptThirdPartyOrderInput): Promise<Order> {
    if (input.thirdPartyOrder.status !== 'received') {
      throw new Error('Somente pedidos recebidos podem ser aceitos.');
    }

    const internalOrderId = `order-delivery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const orderItems = this.toInternalOrderItems(input.thirdPartyOrder.items);
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = input.thirdPartyOrder.total || subtotal;

    const internalOrder: Order = {
      id: internalOrderId,
      enterpriseId: input.thirdPartyOrder.enterpriseId,
      shopId: input.thirdPartyOrder.shopId,
      tableId: 'delivery',
      staffId: input.staffId,
      items: orderItems,
      status: 'pending',
      startTime: Date.now(),
      discount: 0,
      subtotal,
      serviceFee: 0,
      tax: 0,
      total,
      notes: `Pedido de terceiros (${input.thirdPartyOrder.provider})`,
      orderType: 'delivery',
      deliveryEstimate: undefined,
      sourceProvider: input.thirdPartyOrder.provider,
      sourceExternalOrderId: input.thirdPartyOrder.externalOrderId,
      acceptedByStaffId: input.staffId,
    };

    await firebaseService.saveItem('orders', internalOrderId, internalOrder);
    await firebaseService.updateItem('thirdPartyOrders', input.thirdPartyOrder.id, {
      status: 'accepted',
      acceptedAt: Date.now(),
      acceptedByStaffId: input.staffId,
      internalOrderId,
    });

    return internalOrder;
  }

  static async rejectOrder(input: RejectThirdPartyOrderInput): Promise<void> {
    if (input.thirdPartyOrder.status !== 'received') {
      throw new Error('Somente pedidos recebidos podem ser rejeitados.');
    }

    await firebaseService.updateItem('thirdPartyOrders', input.thirdPartyOrder.id, {
      status: 'rejected',
      rejectReason: input.reason.trim() || 'Sem motivo informado',
      rejectedAt: Date.now(),
      rejectedByStaffId: input.staffId,
    });
  }
}
