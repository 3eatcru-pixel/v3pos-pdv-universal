import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Link2, RefreshCw, Save, Send, Store, Truck, Upload, XCircle } from 'lucide-react';
import { useCollection } from '../../../hooks/useCollection';
import { accountService } from '../../../core/services/accountService';
import { ThirdPartyOrderEngine } from '../services/ThirdPartyOrderEngine';
import { ThirdPartyCatalogSyncEngine } from '../services/ThirdPartyCatalogSyncEngine';
import { ThirdPartyProductMappingEngine } from '../services/ThirdPartyProductMappingEngine';
import { ThirdPartyMappingCsvEngine } from '../services/ThirdPartyMappingCsvEngine';
import type {
  InventoryItem,
  Product,
  ThirdPartyCatalogSyncJob,
  ThirdPartyOrder,
  ThirdPartyProvider,
  ThirdPartyProviderConfig,
  ThirdPartyProductMapping,
  ThirdPartySyncJob,
} from '../../../types';
import { formatCurrency } from '../../../lib/utils';

const PROVIDERS: Array<{ id: ThirdPartyProvider; label: string }> = [
  { id: 'ifood', label: 'iFood' },
  { id: 'uber_eats', label: 'Uber Eats' },
  { id: 'google_ordering', label: 'Google Ordering' },
  { id: 'rappi', label: 'Rappi' },
  { id: 'deliveroo', label: 'Deliveroo' },
  { id: 'doordash', label: 'DoorDash' },
  { id: 'other', label: 'Outro' },
];

const EXAMPLE_PAYLOADS: Record<ThirdPartyProvider, string> = {
  ifood: JSON.stringify(
    {
      id: 'ifood-order-001',
      createdAt: 1713888000,
      customer: { name: 'Cliente iFood', phone: '11999998888' },
      items: [
        { id: 'burger-01', name: 'Burger Classico', quantity: 1, unitPrice: 32.9 },
        { id: 'fries-01', name: 'Batata Frita', quantity: 1, unitPrice: 14.5 },
      ],
      subtotal: 47.4,
      deliveryFee: 6.0,
      total: 53.4,
    },
    null,
    2,
  ),
  uber_eats: JSON.stringify(
    {
      event_time: 1713888000,
      meta: {
        resource_id: 'uber-order-001',
        order: {
          eater: { first_name: 'Cliente Uber', phone: '11997776666' },
          items: [{ id: 'pizza-01', name: 'Pizza Margherita', quantity: 1, price: 59.9 }],
          subtotal: 59.9,
          delivery_fee: 7.9,
          total: 67.8,
        },
      },
    },
    null,
    2,
  ),
  google_ordering: JSON.stringify(
    {
      order: {
        id: 'google-order-001',
        createdAt: 1713888000,
        customer: { name: 'Cliente Google', phone: '11995554444' },
        items: [{ id: 'salad-01', name: 'Salada Caesar', quantity: 2, unitPrice: 24.9 }],
        subtotal: 49.8,
        deliveryFee: 8.0,
        total: 57.8,
      },
    },
    null,
    2,
  ),
  rappi: JSON.stringify(
    {
      id: 'rappi-order-001',
      createdAt: 1713888000,
      customerName: 'Cliente Rappi',
      customerPhone: '11996665555',
      items: [{ id: 'combo-01', name: 'Combo Executivo', quantity: 1, unitPrice: 39.9 }],
      subtotal: 39.9,
      deliveryFee: 5.0,
      total: 44.9,
    },
    null,
    2,
  ),
  deliveroo: JSON.stringify(
    {
      id: 'deliveroo-order-001',
      createdAt: 1713888000,
      customerName: 'Cliente Deliveroo',
      customerPhone: '447700900123',
      items: [{ id: 'dr-item-01', name: 'Fish and Chips', quantity: 1, unitPrice: 17.9 }],
      subtotal: 17.9,
      deliveryFee: 2.5,
      total: 20.4,
    },
    null,
    2,
  ),
  doordash: JSON.stringify(
    {
      id: 'doordash-order-001',
      createdAt: 1713888000,
      customerName: 'Cliente DoorDash',
      customerPhone: '14155550123',
      items: [{ id: 'dd-item-01', name: 'Burrito Bowl', quantity: 1, unitPrice: 14.0 }],
      subtotal: 14.0,
      deliveryFee: 3.0,
      total: 17.0,
    },
    null,
    2,
  ),
  other: JSON.stringify(
    {
      id: 'partner-order-001',
      createdAt: 1713888000,
      customerName: 'Cliente Parceiro',
      customerPhone: '11990001111',
      items: [{ id: 'item-01', name: 'Item Externo', quantity: 1, unitPrice: 20.0 }],
      subtotal: 20,
      deliveryFee: 3,
      total: 23,
    },
    null,
    2,
  ),
};

export const ThirdPartyOrdersView: React.FC = () => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const shopId = accountService.getSelectedShopId();
  const currentUser = accountService.getCurrentUser();

  const [selectedProvider, setSelectedProvider] = useState<ThirdPartyProvider>('ifood');
  const [merchantId, setMerchantId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [acceptPath, setAcceptPath] = useState('');
  const [rejectPath, setRejectPath] = useState('');
  const [menuSyncPath, setMenuSyncPath] = useState('');
  const [stockSyncPath, setStockSyncPath] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [pricingMode, setPricingMode] = useState<'base' | 'markup_percent' | 'fixed_price'>('base');
  const [markupPercent, setMarkupPercent] = useState('0');
  const [fixedPriceMultiplier, setFixedPriceMultiplier] = useState('1');
  const [minimumExternalPrice, setMinimumExternalPrice] = useState('0');
  const [autoCatalogSyncEnabled, setAutoCatalogSyncEnabled] = useState(false);
  const [autoCatalogSyncMinutes, setAutoCatalogSyncMinutes] = useState('5');
  const [enabled, setEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [payloadInput, setPayloadInput] = useState(EXAMPLE_PAYLOADS.ifood);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [isSyncingMenu, setIsSyncingMenu] = useState(false);
  const [isSyncingStock, setIsSyncingStock] = useState(false);
  const [mappingProductId, setMappingProductId] = useState('');
  const [mappingExternalSku, setMappingExternalSku] = useState('');
  const [mappingExternalName, setMappingExternalName] = useState('');
  const [isSavingMapping, setIsSavingMapping] = useState(false);
  const [csvImportText, setCsvImportText] = useState('');
  const [csvFileName, setCsvFileName] = useState('');
  const [csvPreviewCount, setCsvPreviewCount] = useState(0);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [actionBusyOrderId, setActionBusyOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastAutoSyncRef = useRef<Record<string, number>>({});
  const autoSyncBusyRef = useRef(false);

  const { data: orders } = useCollection<ThirdPartyOrder>('thirdPartyOrders');
  const { data: configs } = useCollection<ThirdPartyProviderConfig>('thirdPartyProviderConfigs');
  const { data: syncJobs } = useCollection<ThirdPartySyncJob>('thirdPartySyncJobs');
  const { data: catalogSyncJobs } = useCollection<ThirdPartyCatalogSyncJob>('thirdPartyCatalogSyncJobs');
  const { data: productMappings } = useCollection<ThirdPartyProductMapping>('thirdPartyProductMappings');
  const { data: products } = useCollection<Product>('products');
  const { data: inventory } = useCollection<InventoryItem>('inventory');

  const scopedOrders = useMemo(
    () => orders.filter((o) => o.userId === currentUser?.id).sort((a, b) => b.receivedAt - a.receivedAt),
    [orders, currentUser?.id],
  );

  const scopedConfigs = useMemo(
    () => configs.filter((c) => c.userId === currentUser?.id).sort((a, b) => b.updatedAt - a.updatedAt),
    [configs, currentUser?.id],
  );

  const scopedSyncJobs = useMemo(
    () => syncJobs.filter((job) => job.userId === currentUser?.id).sort((a, b) => b.createdAt - a.createdAt),
    [syncJobs, currentUser?.id],
  );

  const scopedCatalogSyncJobs = useMemo(
    () => catalogSyncJobs.filter((job) => job.userId === currentUser?.id).sort((a, b) => b.createdAt - a.createdAt),
    [catalogSyncJobs, currentUser?.id],
  );

  const scopedMappings = useMemo(
    () =>
      productMappings
        .filter((m) => m.userId === currentUser?.id && m.provider === selectedProvider)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [productMappings, currentUser?.id, selectedProvider],
  );

  const syncStats = useMemo(
    () => ({
      pending: [...scopedSyncJobs, ...scopedCatalogSyncJobs].filter((j) => j.status === 'pending').length,
      success: [...scopedSyncJobs, ...scopedCatalogSyncJobs].filter((j) => j.status === 'success').length,
      failed: [...scopedSyncJobs, ...scopedCatalogSyncJobs].filter((j) => j.status === 'failed').length,
    }),
    [scopedSyncJobs, scopedCatalogSyncJobs],
  );

  const applyConfigToForm = (config: ThirdPartyProviderConfig) => {
    setSelectedProvider(config.provider);
    setMerchantId(config.merchantId || '');
    setStoreId(config.storeId || '');
    setClientId(config.clientId || '');
    setClientSecret(config.clientSecret || '');
    setAccessToken(config.accessToken || '');
    setApiBaseUrl(config.apiBaseUrl || '');
    setAcceptPath(config.endpointOverrides?.acceptPath || '');
    setRejectPath(config.endpointOverrides?.rejectPath || '');
    setMenuSyncPath(config.endpointOverrides?.menuSyncPath || '');
    setStockSyncPath(config.endpointOverrides?.stockSyncPath || '');
    setWebhookSecret(config.webhookSecret || '');
    setPollingEnabled(Boolean(config.pollingEnabled));
    setPricingMode(config.pricingMode || 'base');
    setMarkupPercent(String(config.markupPercent ?? 0));
    setFixedPriceMultiplier(String(config.fixedPriceMultiplier ?? 1));
    setMinimumExternalPrice(String(config.minimumExternalPrice ?? 0));
    setAutoCatalogSyncEnabled(Boolean(config.autoCatalogSyncEnabled));
    setAutoCatalogSyncMinutes(String(config.autoCatalogSyncMinutes ?? 5));
    setEnabled(config.enabled);
    setNotes(config.notes || '');
    setPayloadInput(EXAMPLE_PAYLOADS[config.provider]);
  };

  const resetFeedback = () => {
    setMessage(null);
    setError(null);
  };

  const validateContext = (): { enterpriseId: string; shopId: string; userId: string } | null => {
    if (!enterpriseId || !shopId || !currentUser?.id) {
      setError('Sessao sem contexto completo (empresa/loja/usuario).');
      return null;
    }
    return { enterpriseId, shopId, userId: currentUser.id };
  };

  const handleSaveConfig = async () => {
    resetFeedback();
    const ctx = validateContext();
    if (!ctx) return;

    setIsSavingConfig(true);
    try {
      await ThirdPartyOrderEngine.saveProviderConfig({
        enterpriseId: ctx.enterpriseId,
        shopId: ctx.shopId,
        userId: ctx.userId,
        provider: selectedProvider,
        enabled,
        merchantId,
        storeId,
        clientId,
        clientSecret,
        accessToken,
        apiBaseUrl,
        webhookSecret,
        pollingEnabled,
        pricingMode,
        markupPercent: Number(markupPercent || 0),
        fixedPriceMultiplier: Number(fixedPriceMultiplier || 1),
        minimumExternalPrice: Number(minimumExternalPrice || 0),
        autoCatalogSyncEnabled,
        autoCatalogSyncMinutes: Math.max(1, Number(autoCatalogSyncMinutes || 5)),
        endpointOverrides: {
          acceptPath: acceptPath.trim() || undefined,
          rejectPath: rejectPath.trim() || undefined,
          menuSyncPath: menuSyncPath.trim() || undefined,
          stockSyncPath: stockSyncPath.trim() || undefined,
        },
        notes,
      });
      setMessage(`Configuracao salva para ${PROVIDERS.find((p) => p.id === selectedProvider)?.label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar configuracao.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleIngestOrder = async () => {
    resetFeedback();
    const ctx = validateContext();
    if (!ctx) return;

    setIsIngesting(true);
    try {
      const created = await ThirdPartyOrderEngine.ingestOrder({
        enterpriseId: ctx.enterpriseId,
        shopId: ctx.shopId,
        userId: ctx.userId,
        provider: selectedProvider,
        payload: payloadInput,
      });
      setMessage(`Pedido ${created.externalOrderId} recebido e salvo.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao ingerir pedido.');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleAccept = async (order: ThirdPartyOrder) => {
    resetFeedback();
    const staffId = currentUser?.id;
    if (!staffId) {
      setError('Usuario atual indisponivel para aceitar pedido.');
      return;
    }

    setActionBusyOrderId(order.id);
    try {
      const internalOrder = await ThirdPartyOrderEngine.acceptOrder({
        thirdPartyOrder: order,
        staffId,
      });
      setMessage(`Pedido aceito e criado internamente: ${internalOrder.id}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao aceitar pedido.');
    } finally {
      setActionBusyOrderId(null);
    }
  };

  const handleReject = async (order: ThirdPartyOrder) => {
    resetFeedback();
    const staffId = currentUser?.id;
    if (!staffId) {
      setError('Usuario atual indisponivel para rejeitar pedido.');
      return;
    }
    const reason = window.prompt('Motivo da rejeicao:', 'Indisponibilidade operacional');
    if (reason === null) return;

    setActionBusyOrderId(order.id);
    try {
      await ThirdPartyOrderEngine.rejectOrder({
        thirdPartyOrder: order,
        staffId,
        reason,
      });
      setMessage('Pedido rejeitado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao rejeitar pedido.');
    } finally {
      setActionBusyOrderId(null);
    }
  };

  const handleSyncQueue = async () => {
    resetFeedback();
    const ctx = validateContext();
    if (!ctx) return;
    setIsSyncingQueue(true);
    try {
      const result = await ThirdPartyOrderEngine.processSyncQueue(ctx.enterpriseId, ctx.shopId, ctx.userId);
      setMessage(`Fila processada: ${result.processed} jobs, ${result.success} sucesso, ${result.failed} falha.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao processar fila.');
    } finally {
      setIsSyncingQueue(false);
    }
  };

  const getSelectedProviderConfig = (): ThirdPartyProviderConfig | null => {
    const config = scopedConfigs.find((c) => c.provider === selectedProvider);
    if (!config) {
      setError('Salve a configuracao do provedor antes de sincronizar menu/estoque.');
      return null;
    }
    return config;
  };

  const handleSyncMenu = async () => {
    resetFeedback();
    const ctx = validateContext();
    if (!ctx) return;
    const config = getSelectedProviderConfig();
    if (!config) return;
    setIsSyncingMenu(true);
    try {
      const result = await ThirdPartyCatalogSyncEngine.syncMenu(ctx, config, products, scopedMappings);
      setMessage(`Menu sincronizado. Processados: ${result.processed}, sucesso: ${result.success}, falhas: ${result.failed}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao sincronizar menu.');
    } finally {
      setIsSyncingMenu(false);
    }
  };

  const handleSyncStock = async () => {
    resetFeedback();
    const ctx = validateContext();
    if (!ctx) return;
    const config = getSelectedProviderConfig();
    if (!config) return;
    setIsSyncingStock(true);
    try {
      const result = await ThirdPartyCatalogSyncEngine.syncStock(ctx, config, products, inventory, scopedMappings);
      setMessage(`Estoque sincronizado. Processados: ${result.processed}, sucesso: ${result.success}, falhas: ${result.failed}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao sincronizar estoque.');
    } finally {
      setIsSyncingStock(false);
    }
  };

  const handleSaveMapping = async () => {
    resetFeedback();
    const ctx = validateContext();
    if (!ctx) return;
    if (!mappingProductId.trim() || !mappingExternalSku.trim()) {
      setError('Informe Product ID e External SKU para salvar o mapeamento.');
      return;
    }
    setIsSavingMapping(true);
    try {
      await ThirdPartyProductMappingEngine.saveMapping({
        enterpriseId: ctx.enterpriseId,
        shopId: ctx.shopId,
        userId: ctx.userId,
        provider: selectedProvider,
        productId: mappingProductId,
        externalSku: mappingExternalSku,
        externalName: mappingExternalName || undefined,
      });
      setMappingProductId('');
      setMappingExternalSku('');
      setMappingExternalName('');
      setMessage('Mapeamento SKU salvo com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar mapeamento.');
    } finally {
      setIsSavingMapping(false);
    }
  };

  const handleCsvFileChange = async (file: File | null) => {
    resetFeedback();
    if (!file) return;
    try {
      const content = await file.text();
      setCsvFileName(file.name);
      setCsvImportText(content);
      const parsed = ThirdPartyMappingCsvEngine.parse(content);
      setCsvPreviewCount(parsed.length);
      setMessage(`CSV carregado: ${parsed.length} linhas válidas.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar CSV.');
      setCsvPreviewCount(0);
    }
  };

  const handleImportCsvMappings = async () => {
    resetFeedback();
    const ctx = validateContext();
    if (!ctx) return;
    if (!csvImportText.trim()) {
      setError('Carregue um CSV antes de importar.');
      return;
    }

    setIsImportingCsv(true);
    try {
      const rows = ThirdPartyMappingCsvEngine.parse(csvImportText);
      let saved = 0;
      for (const row of rows) {
        const provider = row.provider || selectedProvider;
        await ThirdPartyProductMappingEngine.saveMapping({
          enterpriseId: ctx.enterpriseId,
          shopId: ctx.shopId,
          userId: ctx.userId,
          provider,
          productId: row.productId,
          externalSku: row.externalSku,
          externalName: row.externalName,
          active: row.active,
        });
        saved += 1;
      }
      setMessage(`Importação concluída: ${saved} mapeamentos salvos.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na importação CSV.');
    } finally {
      setIsImportingCsv(false);
    }
  };

  useEffect(() => {
    if (!enterpriseId || !shopId || !currentUser?.id) return;
    const ctx = { enterpriseId, shopId, userId: currentUser.id };

    const tick = async () => {
      if (autoSyncBusyRef.current) return;
      if (!navigator.onLine) return;

      const activeConfigs = scopedConfigs.filter((cfg) => cfg.enabled && cfg.autoCatalogSyncEnabled);
      if (activeConfigs.length === 0) return;

      autoSyncBusyRef.current = true;
      try {
        const now = Date.now();
        for (const cfg of activeConfigs) {
          const cadenceMinutes = Math.max(1, cfg.autoCatalogSyncMinutes || 5);
          const lastRun = lastAutoSyncRef.current[cfg.provider] || 0;
          if (now - lastRun < cadenceMinutes * 60 * 1000) continue;

          const cfgMappings = productMappings.filter((m) => m.provider === cfg.provider && m.userId === ctx.userId);
          await ThirdPartyCatalogSyncEngine.syncMenu(ctx, cfg, products, cfgMappings);
          await ThirdPartyCatalogSyncEngine.syncStock(ctx, cfg, products, inventory, cfgMappings);
          lastAutoSyncRef.current[cfg.provider] = now;
        }
      } catch (err) {
        console.warn('Auto sync de catalogo falhou:', err);
      } finally {
        autoSyncBusyRef.current = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void tick();
    }, 60 * 1000);

    void tick();
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterpriseId, shopId, currentUser?.id, scopedConfigs, products, inventory, productMappings]);

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pedidos de Terceiros</h2>
          <p className="text-sm text-slate-500 font-medium">
            Configuracao por usuario e aceitacao de pedidos para iFood, Uber Eats, Google e outros.
          </p>
        </div>
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
          Usuario atual: {currentUser?.name || currentUser?.id || 'N/A'}
        </div>
      </div>

      {(message || error) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            error ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-slate-700">
            <Store className="w-4 h-4" />
            <h3 className="text-sm font-black uppercase tracking-wider">Configuracao do Canal</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => {
                  setSelectedProvider(provider.id);
                  setPayloadInput(EXAMPLE_PAYLOADS[provider.id]);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                  selectedProvider === provider.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                }`}
              >
                {provider.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-xs font-bold text-slate-600">
              Merchant ID
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={merchantId} onChange={(e) => setMerchantId(e.target.value)} placeholder="merchant-123" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Store ID
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="store-abc" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Client ID
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="client-id" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Client Secret
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="client-secret" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Access Token
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="token opcional" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Gateway API Base URL
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} placeholder="https://seu-gateway.exemplo.com" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Accept Path (override)
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={acceptPath} onChange={(e) => setAcceptPath(e.target.value)} placeholder="/orders/{orderId}/accept" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Reject Path (override)
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={rejectPath} onChange={(e) => setRejectPath(e.target.value)} placeholder="/orders/{orderId}/reject" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Menu Sync Path (override)
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={menuSyncPath} onChange={(e) => setMenuSyncPath(e.target.value)} placeholder="/catalog/menu/sync" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Stock Sync Path (override)
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={stockSyncPath} onChange={(e) => setStockSyncPath(e.target.value)} placeholder="/catalog/stock/sync" />
            </label>
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Webhook Secret
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="assinatura webhook" />
            </label>
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Observacoes
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="janela de aceite, filas, fallback..." />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Regra de preco no terceiro
              <select
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={pricingMode}
                onChange={(e) => setPricingMode(e.target.value as 'base' | 'markup_percent' | 'fixed_price')}
              >
                <option value="base">Preco base</option>
                <option value="markup_percent">Markup %</option>
                <option value="fixed_price">Fator multiplicador</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">
              Markup (%)
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={markupPercent} onChange={(e) => setMarkupPercent(e.target.value)} placeholder="20" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Fator multiplicador
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={fixedPriceMultiplier} onChange={(e) => setFixedPriceMultiplier(e.target.value)} placeholder="1.20" />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Preco minimo externo
              <input className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" value={minimumExternalPrice} onChange={(e) => setMinimumExternalPrice(e.target.value)} placeholder="0" />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              Canal habilitado
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <input type="checkbox" checked={pollingEnabled} onChange={(e) => setPollingEnabled(e.target.checked)} />
              Polling de contingencia
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <input type="checkbox" checked={autoCatalogSyncEnabled} onChange={(e) => setAutoCatalogSyncEnabled(e.target.checked)} />
              Auto sync menu/estoque
            </label>
            <label className="text-xs font-bold text-slate-600">
              Intervalo auto sync (min)
              <input
                className="mt-1 w-28 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={autoCatalogSyncMinutes}
                onChange={(e) => setAutoCatalogSyncMinutes(e.target.value)}
                placeholder="5"
              />
            </label>
            <button
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="ml-auto inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSavingConfig ? 'Salvando...' : 'Salvar configuracao'}
            </button>
            <button
              onClick={handleSyncMenu}
              disabled={isSyncingMenu}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingMenu ? 'animate-spin' : ''}`} />
              {isSyncingMenu ? 'Sync menu...' : 'Sincronizar menu'}
            </button>
            <button
              onClick={handleSyncStock}
              disabled={isSyncingStock}
              className="inline-flex items-center gap-2 bg-cyan-700 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingStock ? 'animate-spin' : ''}`} />
              {isSyncingStock ? 'Sync estoque...' : 'Sincronizar estoque'}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Ingestao de pedido (teste webhook)</h4>
              <button onClick={() => setPayloadInput(EXAMPLE_PAYLOADS[selectedProvider])} className="text-[11px] font-bold text-slate-500 hover:text-slate-700">
                Recarregar exemplo
              </button>
            </div>
            <textarea value={payloadInput} onChange={(e) => setPayloadInput(e.target.value)} className="w-full min-h-52 border border-slate-200 rounded-2xl p-3 font-mono text-xs" />
            <button
              onClick={handleIngestOrder}
              disabled={isIngesting}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {isIngesting ? 'Processando...' : 'Ingerir pedido'}
            </button>
          </div>
        </section>

        <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Link2 className="w-4 h-4" />
            <h3 className="text-sm font-black uppercase tracking-wider">Configuracoes salvas</h3>
          </div>
          {scopedConfigs.length === 0 && <p className="text-xs text-slate-400">Nenhuma configuracao para este usuario.</p>}
          {scopedConfigs.map((cfg) => (
            <button key={cfg.id} onClick={() => applyConfigToForm(cfg)} className="w-full text-left border border-slate-200 rounded-xl p-3 hover:border-slate-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">{PROVIDERS.find((p) => p.id === cfg.provider)?.label || cfg.provider}</span>
                <span className={`text-[10px] font-black uppercase ${cfg.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>{cfg.enabled ? 'Ativo' : 'Inativo'}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{cfg.merchantId || 'Sem merchant id'}</p>
            </button>
          ))}
        </section>
      </div>

      <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Link2 className="w-4 h-4" />
          <h3 className="text-sm font-black uppercase tracking-wider">Mapeamento SKU por provedor</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="text-xs font-bold text-slate-600">
            Product ID interno
            <input
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              value={mappingProductId}
              onChange={(e) => setMappingProductId(e.target.value)}
              placeholder="id do produto no POS"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            External SKU
            <input
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              value={mappingExternalSku}
              onChange={(e) => setMappingExternalSku(e.target.value)}
              placeholder="sku no provedor"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Nome externo (opcional)
            <input
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              value={mappingExternalName}
              onChange={(e) => setMappingExternalName(e.target.value)}
              placeholder="nome no app parceiro"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={handleSaveMapping}
              disabled={isSavingMapping}
              className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSavingMapping ? 'Salvando...' : 'Salvar mapeamento'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-wider text-slate-600">
              Importação CSV em massa ({selectedProvider})
            </p>
            <p className="text-[11px] text-slate-500">
              Colunas: <span className="font-mono">productId,externalSku,externalName,active,provider(opcional)</span>
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2">
            <label className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer">
              <Upload className="w-4 h-4" />
              Escolher CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  void handleCsvFileChange(file);
                }}
              />
            </label>
            <button
              onClick={handleImportCsvMappings}
              disabled={isImportingCsv}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isImportingCsv ? 'Importando...' : 'Importar mapeamentos'}
            </button>
            <span className="inline-flex items-center text-xs text-slate-500">
              {csvFileName ? `${csvFileName} (${csvPreviewCount} linhas)` : 'Nenhum arquivo carregado'}
            </span>
          </div>
          <textarea
            value={csvImportText}
            onChange={(e) => setCsvImportText(e.target.value)}
            placeholder={'productId,externalSku,externalName,active\nprod-1,SKU-IFD-001,Burger Premium,true'}
            className="w-full min-h-28 border border-slate-200 rounded-xl p-3 font-mono text-xs"
          />
        </div>

        <div className="space-y-2">
          {scopedMappings.length === 0 && (
            <p className="text-xs text-slate-400">Sem mapeamentos para {selectedProvider}.</p>
          )}
          {scopedMappings.slice(0, 12).map((mapping) => (
            <div key={mapping.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs">
              <span className="font-bold text-slate-700">{mapping.productId}</span>
              <span className="text-slate-400">{' -> '}</span>
              <span className="font-bold text-indigo-700">{mapping.externalSku}</span>
              {mapping.externalName ? <span className="text-slate-500"> ({mapping.externalName})</span> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Truck className="w-4 h-4" />
            <h3 className="text-sm font-black uppercase tracking-wider">Fila de pedidos recebidos</h3>
          </div>
          <button
            onClick={handleSyncQueue}
            disabled={isSyncingQueue}
            className="inline-flex items-center gap-2 bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncingQueue ? 'animate-spin' : ''}`} />
            {isSyncingQueue ? 'Sincronizando...' : 'Processar fila de sync'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-600">Pendentes: {syncStats.pending}</div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">Sucesso: {syncStats.success}</div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">Falhas: {syncStats.failed}</div>
        </div>

        <div className="space-y-3">
          {scopedOrders.length === 0 && <p className="text-xs text-slate-400">Sem pedidos recebidos para este usuario.</p>}
          {scopedOrders.map((order) => {
            const isPending = order.status === 'received';
            const isBusy = actionBusyOrderId === order.id;
            return (
              <div key={order.id} className="border border-slate-200 rounded-2xl p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">{order.provider} - {order.externalOrderId}</p>
                    <p className="text-sm font-bold text-slate-700">{order.customerName || 'Sem nome'} - {order.customerPhone || 'Sem telefone'}</p>
                    <p className="text-xs text-slate-400">{order.items.length} itens - {formatCurrency(order.total)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    order.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                    order.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                    order.status === 'failed' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {order.status}
                  </span>
                </div>

                {isPending && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleAccept(order)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Aceitar
                    </button>
                    <button
                      onClick={() => handleReject(order)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-2 bg-rose-600 text-white px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeitar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-slate-100 space-y-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Historico de sincronizacao</h4>
          {scopedSyncJobs.length === 0 && <p className="text-xs text-slate-400">Nenhum job de sincronizacao ainda.</p>}
          {scopedSyncJobs.slice(0, 8).map((job) => (
            <div key={job.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">{job.provider} {job.action.toUpperCase()} #{job.externalOrderId}</span>
                <span className={`font-black uppercase ${job.status === 'success' ? 'text-emerald-600' : job.status === 'failed' ? 'text-rose-600' : 'text-slate-500'}`}>{job.status}</span>
              </div>
              <p className="text-slate-400 mt-1">Tentativas: {job.attempts}/{job.maxAttempts}{job.lastError ? ` - ${job.lastError}` : ''}</p>
            </div>
          ))}
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 pt-2">Historico de sync de menu/estoque</h4>
          {scopedCatalogSyncJobs.length === 0 && <p className="text-xs text-slate-400">Nenhum job de catalogo ainda.</p>}
          {scopedCatalogSyncJobs.slice(0, 8).map((job) => (
            <div key={job.id} className="rounded-xl border border-slate-200 px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">{job.provider} {job.type.toUpperCase()}</span>
                <span className={`font-black uppercase ${job.status === 'success' ? 'text-emerald-600' : job.status === 'failed' ? 'text-rose-600' : 'text-slate-500'}`}>{job.status}</span>
              </div>
              <p className="text-slate-400 mt-1">Tentativas: {job.attempts}/{job.maxAttempts}{job.lastError ? ` - ${job.lastError}` : ''}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
