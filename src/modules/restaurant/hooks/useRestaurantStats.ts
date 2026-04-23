import { useMemo } from 'react';
import { startOfDay, addDays, endOfDay } from 'date-fns';
import { Order, Table, Staff } from '../../../types';

export const useRestaurantStats = (
  orders: Order[], 
  tables: Table[], 
  selectedShopId: string | null, 
  currentUser: Staff | null
) => {
  return useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const yesterdayStart = startOfDay(addDays(new Date(), -1)).getTime();
    const yesterdayEnd = endOfDay(addDays(new Date(), -1)).getTime();

    const isRegionalView = currentUser?.role === 'owner' || currentUser?.role === 'regional_manager';
    const relevantOrders = (isRegionalView && !selectedShopId) ? orders : orders.filter(o => o.shopId === selectedShopId);
    
    const closedOrdersToday = relevantOrders.filter(o => o.status === 'delivered' && o.closedAt && o.closedAt >= todayStart);
    const totalSalesToday = closedOrdersToday.reduce((acc, o) => acc + o.total, 0);
    const totalCostToday = closedOrdersToday.reduce((acc, o) => {
      return acc + (o.items || []).reduce((itemAcc, item) => itemAcc + ((item.cost || 0) * item.quantity), 0);
    }, 0);

    const closedOrdersYesterday = relevantOrders.filter(o => o.status === 'delivered' && o.closedAt && o.closedAt >= yesterdayStart && o.closedAt <= yesterdayEnd);
    const totalSalesYesterday = closedOrdersYesterday.reduce((acc, o) => acc + o.total, 0);

    const trend = totalSalesYesterday > 0 
      ? ((totalSalesToday - totalSalesYesterday) / totalSalesYesterday) * 100 
      : 0;

    const avgTicket = closedOrdersToday.length > 0 ? totalSalesToday / closedOrdersToday.length : 0;
    const profitMargin = totalSalesToday > 0 ? ((totalSalesToday - totalCostToday) / totalSalesToday) * 100 : 0;

    const shopPerformance = orders.length > 0 ? [] : []; // Simplified for now, will enhance later
    
    return {
      totalSalesToday,
      trend,
      closedOrdersTodayCount: closedOrdersToday.length,
      activeTablesCount: (isRegionalView && !selectedShopId ? tables : tables.filter(t => t.shopId === selectedShopId)).filter(t => t.status === 'occupied').length,
      avgTicket,
      profitMargin,
      isRegionalView,
      shopPerformance
    };
  }, [orders, tables, selectedShopId, currentUser]);
};
