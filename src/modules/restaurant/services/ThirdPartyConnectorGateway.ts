import type { ThirdPartyProvider, ThirdPartyProviderConfig } from '../../../types';

export interface SendOrderDecisionInput {
  provider: ThirdPartyProvider;
  config: ThirdPartyProviderConfig;
  externalOrderId: string;
  action: 'accept' | 'reject';
  reason?: string;
}

export interface SendCatalogSyncInput {
  provider: ThirdPartyProvider;
  config: ThirdPartyProviderConfig;
  type: 'menu' | 'stock';
  payload: unknown;
}

const buildEndpoint = (baseUrl: string, externalOrderId: string, action: 'accept' | 'reject'): string => {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (action === 'accept') return `${normalizedBase}/orders/${externalOrderId}/accept`;
  return `${normalizedBase}/orders/${externalOrderId}/reject`;
};

const getDefaultProviderPaths = (provider: ThirdPartyProvider) => {
  if (provider === 'uber_eats') {
    return {
      acceptPath: '/v1/eats/order/{orderId}/accept_pos_order',
      rejectPath: '/v1/eats/order/{orderId}/deny_pos_order',
      menuSyncPath: '/catalog/menu/sync',
      stockSyncPath: '/catalog/stock/sync',
    };
  }
  if (provider === 'ifood') {
    return {
      acceptPath: '/merchant/v1.0/orders/{orderId}/confirm',
      rejectPath: '/merchant/v1.0/orders/{orderId}/cancel',
      menuSyncPath: '/catalog/menu/sync',
      stockSyncPath: '/catalog/stock/sync',
    };
  }
  if (provider === 'doordash') {
    return {
      acceptPath: '/drive/v2/orders/{orderId}/accept',
      rejectPath: '/drive/v2/orders/{orderId}/reject',
      menuSyncPath: '/catalog/menu/sync',
      stockSyncPath: '/catalog/stock/sync',
    };
  }
  if (provider === 'deliveroo') {
    return {
      acceptPath: '/partner/orders/{orderId}/accept',
      rejectPath: '/partner/orders/{orderId}/reject',
      menuSyncPath: '/catalog/menu/sync',
      stockSyncPath: '/catalog/stock/sync',
    };
  }
  return {
    acceptPath: '/orders/{orderId}/accept',
    rejectPath: '/orders/{orderId}/reject',
    menuSyncPath: '/catalog/menu/sync',
    stockSyncPath: '/catalog/stock/sync',
  };
};

const composePath = (baseUrl: string, pathTemplate: string, orderId?: string): string => {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = pathTemplate.startsWith('/') ? pathTemplate : `/${pathTemplate}`;
  const resolvedPath = orderId ? normalizedPath.replace('{orderId}', orderId) : normalizedPath;
  return `${normalizedBase}${resolvedPath}`;
};

export class ThirdPartyConnectorGateway {
  static async sendOrderDecision(input: SendOrderDecisionInput): Promise<void> {
    if (!input.config.apiBaseUrl) {
      throw new Error(
        `Provedor ${input.provider} sem apiBaseUrl configurada. Defina um gateway para sincronização externa.`,
      );
    }

    const defaults = getDefaultProviderPaths(input.provider);
    const actionPath =
      input.action === 'accept'
        ? input.config.endpointOverrides?.acceptPath || defaults.acceptPath
        : input.config.endpointOverrides?.rejectPath || defaults.rejectPath;
    const endpoint = composePath(input.config.apiBaseUrl, actionPath, input.externalOrderId);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Provider': input.provider,
      'X-Client-Id': input.config.clientId || '',
      'X-Merchant-Id': input.config.merchantId || '',
    };

    if (input.config.accessToken) {
      headers.Authorization = `Bearer ${input.config.accessToken}`;
    } else if (input.config.clientSecret) {
      headers.Authorization = `Bearer ${input.config.clientSecret}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        externalOrderId: input.externalOrderId,
        action: input.action,
        reason: input.reason,
        provider: input.provider,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      const errorMsg = import.meta.env.DEV 
        ? `Falha no gateway ${input.provider} (${response.status}): ${body}`
        : `Não foi possível processar a decisão com o parceiro logístico (${input.provider}).`;
      
      logger.error('integration', 'Falha na decisão de pedido externo', { provider: input.provider, status: response.status, body });
      throw new Error(errorMsg);
    }
  }

  static async sendCatalogSync(input: SendCatalogSyncInput): Promise<void> {
    if (!input.config.apiBaseUrl) {
      throw new Error(`Provedor ${input.provider} sem apiBaseUrl configurada.`);
    }

    const defaults = getDefaultProviderPaths(input.provider);
    const syncPath =
      input.type === 'menu'
        ? input.config.endpointOverrides?.menuSyncPath || defaults.menuSyncPath
        : input.config.endpointOverrides?.stockSyncPath || defaults.stockSyncPath;
    const endpoint = composePath(input.config.apiBaseUrl, syncPath);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Provider': input.provider,
      'X-Client-Id': input.config.clientId || '',
      'X-Merchant-Id': input.config.merchantId || '',
    };

    if (input.config.accessToken) {
      headers.Authorization = `Bearer ${input.config.accessToken}`;
    } else if (input.config.clientSecret) {
      headers.Authorization = `Bearer ${input.config.clientSecret}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(input.payload),
    });

    if (!response.ok) {
      const body = await response.text();
      const errorMsg = import.meta.env.DEV 
        ? `Falha no sync de ${input.type} (${response.status}): ${body}`
        : `Ocorreu uma falha na sincronização de ${input.type === 'menu' ? 'cardápio' : 'estoque'} com o parceiro ${input.provider}.`;
      
      logger.error('integration', 'Falha no sincronismo de catálogo', { provider: input.provider, type: input.type, status: response.status });
      throw new Error(errorMsg);
    }
  }
}
