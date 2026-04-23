import { firebaseService } from '../../../services/firebaseService';
import type {
  InventoryItem,
  Product,
  ThirdPartyCatalogSyncJob,
  ThirdPartyProductMapping,
  ThirdPartyProviderConfig,
} from '../../../types';
import { ThirdPartyConnectorGateway } from './ThirdPartyConnectorGateway';

interface SyncContext {
  enterpriseId: string;
  shopId: string;
  userId: string;
}

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

const computeExternalPrice = (basePrice: number, config: ThirdPartyProviderConfig): number => {
  const safeBase = Math.max(0, basePrice);
  let result = safeBase;

  if (config.pricingMode === 'markup_percent') {
    const markup = Math.max(0, config.markupPercent || 0);
    result = safeBase * (1 + markup / 100);
  } else if (config.pricingMode === 'fixed_price') {
    const multiplier = Math.max(0.01, config.fixedPriceMultiplier || 1);
    result = safeBase * multiplier;
  }

  if (typeof config.minimumExternalPrice === 'number') {
    result = Math.max(result, Math.max(0, config.minimumExternalPrice));
  }

  return roundCurrency(result);
};

const resolveProductStock = (product: Product, inventory: InventoryItem[]): number => {
  const byId = inventory.find((item) => item.id === product.id);
  if (byId) return Math.max(0, byId.currentStock);

  const byName = inventory.find((item) => item.name.trim().toLowerCase() === product.name.trim().toLowerCase());
  if (byName) return Math.max(0, byName.currentStock);

  const maybeStock = (product as unknown as { stock?: number; currentStock?: number });
  if (typeof maybeStock.currentStock === 'number') return Math.max(0, maybeStock.currentStock);
  if (typeof maybeStock.stock === 'number') return Math.max(0, maybeStock.stock);
  return 0;
};

const buildMappingIndex = (mappings: ThirdPartyProductMapping[]): Record<string, ThirdPartyProductMapping> =>
  mappings.reduce<Record<string, ThirdPartyProductMapping>>((acc, mapping) => {
    acc[mapping.productId] = mapping;
    return acc;
  }, {});

export class ThirdPartyCatalogSyncEngine {
  static buildMenuPayload(
    products: Product[],
    config: ThirdPartyProviderConfig,
    context: SyncContext,
    mappings: ThirdPartyProductMapping[],
  ) {
    const mappingIndex = buildMappingIndex(mappings.filter((m) => m.provider === config.provider));
    const activeProducts = products.filter((p) => p.active);
    return {
      enterpriseId: context.enterpriseId,
      shopId: context.shopId,
      provider: config.provider,
      generatedAt: Date.now(),
      items: activeProducts.map((product) => ({
        id: mappingIndex[product.id]?.externalSku || product.id,
        internalProductId: product.id,
        name: mappingIndex[product.id]?.externalName || product.name,
        category: product.category,
        basePrice: product.price,
        externalPrice: computeExternalPrice(product.price, config),
        active: Boolean(product.active),
        description: (product as unknown as { description?: string }).description || '',
        sku: (product as unknown as { sku?: string }).sku || null,
      })),
    };
  }

  static buildStockPayload(
    products: Product[],
    inventory: InventoryItem[],
    config: ThirdPartyProviderConfig,
    context: SyncContext,
    mappings: ThirdPartyProductMapping[],
  ) {
    const mappingIndex = buildMappingIndex(mappings.filter((m) => m.provider === config.provider));
    const activeProducts = products.filter((p) => p.active);
    return {
      enterpriseId: context.enterpriseId,
      shopId: context.shopId,
      provider: config.provider,
      generatedAt: Date.now(),
      items: activeProducts.map((product) => ({
        id: mappingIndex[product.id]?.externalSku || product.id,
        internalProductId: product.id,
        name: product.name,
        availableStock: resolveProductStock(product, inventory),
        active: Boolean(product.active),
      })),
    };
  }

  static async enqueueSyncJob(
    context: SyncContext,
    config: ThirdPartyProviderConfig,
    type: 'menu' | 'stock',
    payload: unknown,
  ): Promise<ThirdPartyCatalogSyncJob> {
    const job: ThirdPartyCatalogSyncJob = {
      id: `tp-catalog-sync-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      enterpriseId: context.enterpriseId,
      shopId: context.shopId,
      userId: context.userId,
      provider: config.provider,
      type,
      status: 'pending',
      attempts: 0,
      maxAttempts: 5,
      nextAttemptAt: Date.now(),
      payload: JSON.stringify(payload),
      createdAt: Date.now(),
    };
    await firebaseService.saveItem('thirdPartyCatalogSyncJobs', job.id, job);
    return job;
  }

  static async processQueue(context: SyncContext): Promise<{ processed: number; success: number; failed: number }> {
    const all = (await firebaseService.getAllDocs('thirdPartyCatalogSyncJobs', context.enterpriseId, context.shopId)) as ThirdPartyCatalogSyncJob[];
    const configs = (await firebaseService.getAllDocs('thirdPartyProviderConfigs', context.enterpriseId, context.shopId)) as ThirdPartyProviderConfig[];
    const now = Date.now();
    const queue = all
      .filter((job) => job.userId === context.userId && job.status === 'pending' && job.nextAttemptAt <= now && job.attempts < job.maxAttempts)
      .sort((a, b) => a.nextAttemptAt - b.nextAttemptAt);

    let success = 0;
    let failed = 0;

    for (const job of queue) {
      const config = configs.find((c) => c.userId === context.userId && c.provider === job.provider);
      if (!config || !config.enabled) {
        failed += 1;
        await firebaseService.updateItem('thirdPartyCatalogSyncJobs', job.id, {
          attempts: job.attempts + 1,
          lastAttemptAt: Date.now(),
          lastError: 'Config do provedor nao encontrada ou desabilitada.',
          nextAttemptAt: Date.now() + 10 * 60 * 1000,
          status: job.attempts + 1 >= job.maxAttempts ? 'failed' : 'pending',
        });
        continue;
      }

      try {
        await ThirdPartyConnectorGateway.sendCatalogSync({
          provider: job.provider,
          config,
          type: job.type,
          payload: JSON.parse(job.payload),
        });
        success += 1;
        await firebaseService.updateItem('thirdPartyCatalogSyncJobs', job.id, {
          status: 'success',
          attempts: job.attempts + 1,
          lastAttemptAt: Date.now(),
          completedAt: Date.now(),
          lastError: null,
        });
      } catch (err) {
        failed += 1;
        const attempts = job.attempts + 1;
        const delay = Math.min(30 * 60 * 1000, Math.pow(2, attempts) * 1000);
        await firebaseService.updateItem('thirdPartyCatalogSyncJobs', job.id, {
          attempts,
          lastAttemptAt: Date.now(),
          lastError: err instanceof Error ? err.message : 'Erro desconhecido',
          nextAttemptAt: Date.now() + delay,
          status: attempts >= job.maxAttempts ? 'failed' : 'pending',
          completedAt: attempts >= job.maxAttempts ? Date.now() : null,
        });
      }
    }

    return { processed: queue.length, success, failed };
  }

  static async syncMenu(
    context: SyncContext,
    config: ThirdPartyProviderConfig,
    products: Product[],
    mappings: ThirdPartyProductMapping[],
  ) {
    const payload = this.buildMenuPayload(products, config, context, mappings);
    await this.enqueueSyncJob(context, config, 'menu', payload);
    return this.processQueue(context);
  }

  static async syncStock(
    context: SyncContext,
    config: ThirdPartyProviderConfig,
    products: Product[],
    inventory: InventoryItem[],
    mappings: ThirdPartyProductMapping[],
  ) {
    const payload = this.buildStockPayload(products, inventory, config, context, mappings);
    await this.enqueueSyncJob(context, config, 'stock', payload);
    return this.processQueue(context);
  }
}
