import React from 'react';

/**
 * Registro Central de Widgets do PDV Universal
 * Cada widget é carregado apenas se o usuário tiver a permissão necessária.
 */
export interface WidgetDefinition {
  id: string;
  component: React.LazyExoticComponent<React.FC<any>>;
  permission: 'canViewSales' | 'canManageInventory' | 'canManageStaff'; // Permissões de acesso
  gridSpan: 'small' | 'medium' | 'large';
}

export const WidgetRegistry: Record<string, WidgetDefinition> = {
  'SALES_TODAY': {
    id: 'SALES_TODAY',
    component: React.lazy(() => import('../widgets/SalesTodayWidget')), // Widget de vendas do dia
    permission: 'canViewSales',
    gridSpan: 'small'
  },
  'PROFIT_MARGIN': {
    id: 'PROFIT_MARGIN',
    component: React.lazy(() => import('../widgets/ProfitMarginWidget')), // Widget de margem de lucro
    permission: 'canViewSales',
    gridSpan: 'small'
  },
  'STOCK_ALERTS': {
    id: 'STOCK_ALERTS',
    component: React.lazy(() => import('../widgets/StockAlertsWidget')), // Widget de alertas de estoque
    permission: 'canManageInventory',
    gridSpan: 'small'
  },
  'LABOR_COST': {
    id: 'LABOR_COST',
    component: React.lazy(() => import('../widgets/LaborCostWidget')), // Widget de custo de mão de obra
    permission: 'canManageStaff',
    gridSpan: 'medium'
  },
  'FORECAST_VS_SALES': {
    id: 'FORECAST_VS_SALES',
    component: React.lazy(() => import('../widgets/ForecastVsSalesWidget')), // Widget de previsão vs vendas
    permission: 'canViewSales',
    gridSpan: 'medium'
  },
  'BUSINESS_MODEL_REVENUE': {
    id: 'BUSINESS_MODEL_REVENUE',
    component: React.lazy(() => import('../widgets/BusinessModelRevenueWidget')),
    permission: 'canViewSales',
    gridSpan: 'medium'
  }
};