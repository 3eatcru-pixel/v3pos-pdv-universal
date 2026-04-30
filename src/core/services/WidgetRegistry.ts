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
    component: React.lazy(() => import('./SalesTodayWidget')), // Widget de vendas do dia
    permission: 'canViewSales',
    gridSpan: 'small'
  },
  'PROFIT_MARGIN': {
    id: 'PROFIT_MARGIN',
    component: React.lazy(() => import('./ProfitMarginWidget')), // Widget de margem de lucro
    permission: 'canViewSales',
    gridSpan: 'small'
  },
  'STOCK_ALERTS': {
    id: 'STOCK_ALERTS',
    component: React.lazy(() => import('./StockAlertsWidget')), // Widget de alertas de estoque
    permission: 'canManageInventory',
    gridSpan: 'small'
  },
  'LABOR_COST': {
    id: 'LABOR_COST',
    component: React.lazy(() => import('./LaborCostWidget')), // Widget de custo de mão de obra
    permission: 'canManageStaff',
    gridSpan: 'medium'
  },
  'FORECAST_VS_SALES': {
    id: 'FORECAST_VS_SALES',
    component: React.lazy(() => import('./ForecastVsSalesWidget')), // Widget de previsão vs vendas
    permission: 'canViewSales',
    gridSpan: 'medium'
  },
  'BUSINESS_MODEL_REVENUE': {
    id: 'BUSINESS_MODEL_REVENUE',
    component: React.lazy(() => import('./BusinessModelRevenueWidget')),
    permission: 'canViewSales',
    gridSpan: 'medium'
  },
  'PENDING_OPERATIONS': {
    id: 'PENDING_OPERATIONS',
    component: React.lazy(() => import('./PendingOperationsMonitorWidget')),
    permission: 'canViewSales',
    gridSpan: 'medium'
  },
  'SIMULATION_RANKING': {
    id: 'SIMULATION_RANKING',
    component: React.lazy(() => import('./SimulationRankingWidget')),
    permission: 'canViewSales',
    gridSpan: 'medium'
  },
  'ONBOARDING_PROGRESS': {
    id: 'ONBOARDING_PROGRESS',
    component: React.lazy(() => import('./OnboardingProgressWidget')),
    permission: 'canViewSales',
    gridSpan: 'medium'
  },
  'NEGATIVE_STOCK_MONITOR': {
    id: 'NEGATIVE_STOCK_MONITOR',
    component: React.lazy(() => import('./NegativeStockMonitorWidget')),
    permission: 'canManageInventory',
    gridSpan: 'medium'
  },
  'HARDWARE_STATUS': {
    id: 'HARDWARE_STATUS',
    component: React.lazy(() => import('./HardwareStatusWidget')),
    permission: 'canViewSales',
    gridSpan: 'small'
  },
  'LOCAL_LEGENDS': {
    id: 'LOCAL_LEGENDS',
    component: React.lazy(() => import('./LocalLegendsWidget')),
    permission: 'canViewSales',
    gridSpan: 'medium'
  }
};
