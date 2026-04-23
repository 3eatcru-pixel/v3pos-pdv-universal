import React, { useMemo, useState } from 'react';
import { CheckCircle2, Link2, Save, Send, Store, Truck, XCircle } from 'lucide-react';
import { useCollection } from '../../../hooks/useCollection';
import { accountService } from '../../../core/services/accountService';
import { ThirdPartyOrderEngine } from '../services/ThirdPartyOrderEngine';
import type { ThirdPartyOrder, ThirdPartyProvider, ThirdPartyProviderConfig } from '../../../types';
import { formatCurrency } from '../../../lib/utils';

const PROVIDERS: Array<{ id: ThirdPartyProvider; label: string }> = [
  { id: 'ifood', label: 'iFood' },
  { id: 'uber_eats', label: 'Uber Eats' },
  { id: 'google_ordering', label: 'Google Ordering' },
  { id: 'rappi', label: 'Rappi' },
  { id: 'other', label: 'Outro' },
];

const EXAMPLE_PAYLOADS: Record<ThirdPartyProvider, string> = {
  ifood: JSON.stringify(
    {
      id: 'ifood-order-001',
      createdAt: 1713888000,
      customer: { name: 'Cliente iFood', phone: '11999998888' },
      items: [
        { id: 'burger-01', name: 'Burger Clássico', quantity: 1, unitPrice: 32.9 },
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
  const [webhookSecret, setWebhookSecret] = useState('');
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [payloadInput, setPayloadInput] = useState(EXAMPLE_PAYLOADS.ifood);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [actionBusyOrderId, setActionBusyOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: orders } = useCollection<ThirdPartyOrder>('thirdPartyOrders');
  const { data: configs } = useCollection<ThirdPartyProviderConfig>('thirdPartyProviderConfigs');

  const scopedOrders = useMemo(
    () =>
      orders
        .filter((o) => o.userId === currentUser?.id)
        .sort((a, b) => b.receivedAt - a.receivedAt),
    [orders, currentUser?.id],
  );

  const scopedConfigs = useMemo(
    () =>
      configs
        .filter((c) => c.userId === currentUser?.id)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [configs, currentUser?.id],
  );

  const applyConfigToForm = (config: ThirdPartyProviderConfig) => {
    setSelectedProvider(config.provider);
    setMerchantId(config.merchantId || '');
    setStoreId(config.storeId || '');
    setClientId(config.clientId || '');
    setClientSecret(config.clientSecret || '');
    setWebhookSecret(config.webhookSecret || '');
    setPollingEnabled(Boolean(config.pollingEnabled));
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
      setError('Sessão sem contexto completo (empresa/loja/usuário).');
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
        webhookSecret,
        pollingEnabled,
        notes,
      });
      setMessage(`Configuração salva para ${PROVIDERS.find((p) => p.id === selectedProvider)?.label}.`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao salvar configuração.';
      setError(errorMessage);
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
      const errorMessage = err instanceof Error ? err.message : 'Falha ao ingerir pedido.';
      setError(errorMessage);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleAccept = async (order: ThirdPartyOrder) => {
    resetFeedback();
    const staffId = currentUser?.id;
    if (!staffId) {
      setError('Usuário atual indisponível para aceitar pedido.');
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
      const errorMessage = err instanceof Error ? err.message : 'Falha ao aceitar pedido.';
      setError(errorMessage);
    } finally {
      setActionBusyOrderId(null);
    }
  };

  const handleReject = async (order: ThirdPartyOrder) => {
    resetFeedback();
    const staffId = currentUser?.id;
    if (!staffId) {
      setError('Usuário atual indisponível para rejeitar pedido.');
      return;
    }
    const reason = window.prompt('Motivo da rejeição:', 'Indisponibilidade operacional');
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
      const errorMessage = err instanceof Error ? err.message : 'Falha ao rejeitar pedido.';
      setError(errorMessage);
    } finally {
      setActionBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pedidos de Terceiros</h2>
          <p className="text-sm text-slate-500 font-medium">
            Configuração por usuário e aceitação de pedidos para iFood, Uber Eats, Google e outros.
          </p>
        </div>
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
          Usuário atual: {currentUser?.name || currentUser?.id || 'N/A'}
        </div>
      </div>

      {(message || error) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            error
              ? 'bg-rose-50 text-rose-700 border-rose-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 text-slate-700">
            <Store className="w-4 h-4" />
            <h3 className="text-sm font-black uppercase tracking-wider">Configuração do Canal</h3>
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
              <input
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                placeholder="merchant-123"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Store ID
              <input
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="store-abc"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Client ID
              <input
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="client-id"
              />
            </label>
            <label className="text-xs font-bold text-slate-600">
              Client Secret
              <input
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="client-secret"
              />
            </label>
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Webhook Secret
              <input
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                placeholder="assinatura webhook"
              />
            </label>
            <label className="text-xs font-bold text-slate-600 md:col-span-2">
              Observações
              <input
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="janela de aceite, filas, fallback..."
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              Canal habilitado
            </label>
            <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
              <input
                type="checkbox"
                checked={pollingEnabled}
                onChange={(e) => setPollingEnabled(e.target.checked)}
              />
              Polling de contingência
            </label>
            <button
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="ml-auto inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSavingConfig ? 'Salvando...' : 'Salvar configuração'}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                Ingestão de pedido (teste de webhook)
              </h4>
              <button
                onClick={() => setPayloadInput(EXAMPLE_PAYLOADS[selectedProvider])}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-700"
              >
                Recarregar exemplo
              </button>
            </div>
            <textarea
              value={payloadInput}
              onChange={(e) => setPayloadInput(e.target.value)}
              className="w-full min-h-52 border border-slate-200 rounded-2xl p-3 font-mono text-xs"
            />
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
            <h3 className="text-sm font-black uppercase tracking-wider">Configurações salvas</h3>
          </div>
          {scopedConfigs.length === 0 && (
            <p className="text-xs text-slate-400">Nenhuma configuração para este usuário.</p>
          )}
          {scopedConfigs.map((cfg) => (
            <button
              key={cfg.id}
              onClick={() => applyConfigToForm(cfg)}
              className="w-full text-left border border-slate-200 rounded-xl p-3 hover:border-slate-400 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                  {PROVIDERS.find((p) => p.id === cfg.provider)?.label || cfg.provider}
                </span>
                <span className={`text-[10px] font-black uppercase ${cfg.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {cfg.enabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{cfg.merchantId || 'Sem merchant id'}</p>
            </button>
          ))}
        </section>
      </div>

      <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Truck className="w-4 h-4" />
          <h3 className="text-sm font-black uppercase tracking-wider">Fila de pedidos recebidos</h3>
        </div>
        <div className="space-y-3">
          {scopedOrders.length === 0 && (
            <p className="text-xs text-slate-400">Sem pedidos recebidos para este usuário.</p>
          )}
          {scopedOrders.map((order) => {
            const isPending = order.status === 'received';
            const isBusy = actionBusyOrderId === order.id;
            return (
              <div key={order.id} className="border border-slate-200 rounded-2xl p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                      {order.provider} • {order.externalOrderId}
                    </p>
                    <p className="text-sm font-bold text-slate-700">
                      {order.customerName || 'Sem nome'} • {order.customerPhone || 'Sem telefone'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {order.items.length} itens • {formatCurrency(order.total)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      order.status === 'accepted'
                        ? 'bg-emerald-100 text-emerald-700'
                        : order.status === 'rejected'
                        ? 'bg-rose-100 text-rose-700'
                        : order.status === 'failed'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
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
      </section>
    </div>
  );
};
