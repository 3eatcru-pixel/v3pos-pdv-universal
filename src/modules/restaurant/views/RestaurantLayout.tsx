import React, { useState } from 'react';
import { 
  Utensils, 
  LayoutDashboard, 
  ChefHat, 
  Users, 
  ClipboardList, 
  Calendar, 
  DollarSign, 
  Settings, 
  Database,
  ShoppingCart,
  Grid,
  ShieldCheck,
  Calendar as CalendarIcon,
  Clock,
  History,
  Truck
} from 'lucide-react';
import { startOfDay } from 'date-fns';
import { RestaurantDashboard } from './RestaurantDashboard';
import { TableMapView } from './TableMapView';
import { KitchenDisplayView } from './KitchenDisplayView';
import { MenuManagementView } from './MenuManagementView';
import { RestaurantHistoryView } from './RestaurantHistoryView';
import { InventoryManagementView } from '../../../core/views/InventoryManagementView';
import { ReservationManagementView } from './ReservationManagementView';
import { RestaurantSafetyView } from './RestaurantSafetyView';
import { PendingOrdersView } from './PendingOrdersView';
import { StaffScheduleView } from '../../../core/views/StaffScheduleView';
import { GeneralStaffView } from '../../../core/views/GeneralStaffView';
import { FinanceManagementView } from '../../../core/views/FinanceManagementView';
import { CompanyManagement } from '../../../core/views/CompanyManagement';
import { OrderManagement } from './OrderManagement';
import { ThirdPartyOrdersView } from './ThirdPartyOrdersView';
import { BaseModuleLayout } from '../../../core/components/BaseModuleLayout';
import { useCollection } from '../../../hooks/useCollection';
import { accountService } from '../../../core/services/accountService';
import { firebaseService } from '../../../services/firebaseService';
import { InventoryEngine } from '../../../core/services/InventoryEngine';
import { calculateOrderTotals } from '../../../core/utils/OrderCalculator';
import { Table, Product, Order, Staff, InventoryItem, OrderItem, ItemStatus, OrderStatus } from '../../../types';

interface RestaurantLayoutProps {
  defaultView?: string;
}

export const RestaurantLayout: React.FC<RestaurantLayoutProps> = ({ defaultView = 'tables' }) => {
  const enterpriseId = accountService.getCurrentCompanyId();
  const selectedShopId = accountService.getSelectedShopId();
  const currentUser = accountService.getCurrentUser();

  const { data: tables } = useCollection<Table>('tables');
  const { data: products } = useCollection<Product>('products');
  const { data: orders } = useCollection<Order>('orders');
  const { data: staff } = useCollection<Staff>('staff');
  const { data: inventory } = useCollection<InventoryItem>('inventory');

  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const navItems = [
    { id: 'dashboard', icon: <LayoutDashboard />, label: 'Dashboard', roles: ['owner', 'manager', 'dev'] },
    { id: 'tables', icon: <Grid />, label: 'Mapa de Mesas', roles: ['owner', 'manager', 'staff', 'operator', 'dev'] },
    { id: 'kitchen', icon: <ChefHat />, label: 'Cozinha (KDS)', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'history', icon: <History />, label: 'Histórico de Vendas', roles: ['owner', 'manager', 'dev'] },
    { id: 'orders', icon: <ClipboardList />, label: 'Comandas', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'pending_orders', icon: <Clock />, label: 'Pendentes', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'third_party_orders', icon: <Truck />, label: 'Pedidos Terceiros', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'menu', icon: <ClipboardList />, label: 'Cardápio / Menu', roles: ['owner', 'manager', 'dev'] },
    { id: 'inventory', icon: <Utensils />, label: 'Estoque / Insumos', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'reservations', icon: <Calendar />, label: 'Reservas', roles: ['owner', 'manager', 'staff', 'dev'] },
    { id: 'staff', icon: <Users />, label: 'RH Central', roles: ['owner', 'manager', 'dev'] },
    { id: 'schedule', icon: <CalendarIcon />, label: 'Escala Staff', roles: ['owner', 'manager', 'dev'] },
    { id: 'safety', icon: <ShieldCheck />, label: 'Saúde & Segurança', roles: ['owner', 'manager', 'dev'] },
    { id: 'finance', icon: <DollarSign />, label: 'Financeiro', roles: ['owner', 'manager', 'dev'] },
    { id: 'management', icon: <Database />, label: 'Gestão da Unidade', roles: ['owner', 'dev'] },
  ];

  const setupOptions = [
    { id: 'restaurant_waiter', label: 'Modo Garçom', desc: 'Lançamento rápido de pedidos em mesas.', icon: <Users />, color: 'bg-emerald-500' },
    { id: 'kitchen', label: 'Modo Cozinha/KDS', desc: 'Interface de produção para chefs.', icon: <Utensils />, color: 'bg-emerald-500' },
    { id: 'safety', label: 'Checklist Sanitário', desc: 'Conformidade ANVISA diária.', icon: <ShieldCheck />, color: 'bg-blue-500' },
    { id: 'admin', label: 'Gestão/Dashboard', desc: 'Visão 360 do negócio.', icon: <LayoutDashboard />, color: 'bg-indigo-500' },
  ];

  const adjustInventory = async (items: OrderItem[], multiplier: number) => {
    try {
      await InventoryEngine.adjustStockRecursive(
        items.map(i => ({ ...i, id: i.productId })),
        multiplier,
        enterpriseId || 'local-ent',
        selectedShopId || 'shop-1',
        inventory
      );
    } catch (error) {
      console.error("Failed to adjust inventory:", error);
    }
  };

  const handleSendToKitchen = async (orderId: string, cartItems: OrderItem[]) => {
    const newItems = cartItems.filter(i => i.status === 'pending');
    if (newItems.length === 0) return;

    const waiterId = currentUser?.id || 'a1';
    const isTakeaway = !selectedTable;
    
    let finalOrderId = orderId;
    let existingOrder = orders.find(o => o.id === orderId);
    let nextTakeawayNumber = 0;

    if (isTakeaway && !existingOrder) {
      const today = startOfDay(new Date()).getTime();
      const todayTakeaways = orders.filter(o => o.orderType === 'takeaway' && o.startTime >= today);
      nextTakeawayNumber = todayTakeaways.length + 1;
      finalOrderId = `take-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    }

    const updatedCart = cartItems.map(i => i.status === 'pending' ? { 
      ...i, 
      status: 'preparing' as ItemStatus, 
      sentToKitchen: true 
    } : i);

    const { subtotal, serviceFee, tax, discount, total: finalTotal, totalCost } = calculateOrderTotals(updatedCart, existingOrder?.discount || 0, isTakeaway);

    const orderData: Order = {
      id: finalOrderId,
      enterpriseId: enterpriseId || 'local-ent',
      shopId: (selectedShopId || 'shop-1'),
      tableId: isTakeaway ? 'takeaway' : selectedTable!.id,
      staffId: waiterId,
      items: updatedCart,
      status: 'preparing' as OrderStatus,
      startTime: existingOrder?.startTime || Date.now(),
      discount,
      subtotal,
      serviceFee,
      tax,
      total: finalTotal,
      totalCost,
      orderType: isTakeaway ? 'takeaway' : 'table',
      takeawayNumber: isTakeaway ? (existingOrder?.takeawayNumber || nextTakeawayNumber) : undefined
    };

    await firebaseService.saveItem('orders', finalOrderId, orderData);
    if (!isTakeaway) {
      await firebaseService.updateItem('tables', selectedTable!.id, { status: 'occupied', currentOrderId: finalOrderId });
    }

    await adjustInventory(newItems, -1);

    // Notification
    const tableNumDisplay = isTakeaway ? `Takeaway #${orderData.takeawayNumber}` : `Mesa 0${selectedTable?.number}`;
    await firebaseService.saveItem('notifications', `notif-${Date.now()}`, {
      id: `notif-${Date.now()}`,
      shopId: (selectedShopId || 'shop-1'),
      message: `🍗 Cozinha: Novo Pedido ${tableNumDisplay}`,
      type: 'new_order_kitchen',
      tableId: isTakeaway ? 'takeaway' : selectedTable?.id,
      timestamp: Date.now(),
      read: false,
      enterpriseId: enterpriseId!
    });
  };

  const renderContent = (currentView: string, setView: (v: string) => void) => {
    switch (currentView) {
      case 'dashboard': return <RestaurantDashboard />;
      case 'tables': return <TableMapView onOpenTable={(table) => {
        setSelectedTable(table);
        setView('orders');
      }} />;
      case 'orders': return <OrderManagement 
        products={products}
        tables={tables}
        orders={orders}
        staff={staff}
        selectedTable={selectedTable}
        onBack={() => {
          setSelectedTable(null);
          setView('tables');
        }}
        onAssignTable={(table) => setSelectedTable(table)}
        onSendToKitchen={handleSendToKitchen}
        onCloseOrder={async (id) => {
          // Closure logic
          await firebaseService.updateItem('orders', id, { status: 'delivered', closedAt: Date.now() });
          const order = orders.find(o => o.id === id);
          if (order?.tableId && order.tableId !== 'takeaway') {
            await firebaseService.updateItem('tables', order.tableId, { status: 'free', currentOrderId: null });
          }
          setView('tables');
        }}
      />;
      case 'pending_orders': return <PendingOrdersView onOpenThirdParty={() => setView('third_party_orders')} />;
      case 'third_party_orders': return <ThirdPartyOrdersView />;
      case 'history': return <RestaurantHistoryView />;
      case 'kitchen': return <KitchenDisplayView type="kitchen" />;
      case 'menu': return <MenuManagementView />;
      case 'inventory': return <InventoryManagementView module="restaurant" />;
      case 'reservations': return <ReservationManagementView />;
      case 'staff': return <GeneralStaffView module="restaurant" />;
      case 'schedule': return <StaffScheduleView module="restaurant" />;
      case 'safety': return <RestaurantSafetyView />;
      case 'finance': return <FinanceManagementView module="restaurant" />;
      case 'management': return <CompanyManagement />;
      default: return <TableMapView />;
    }
  };

  return (
    <BaseModuleLayout 
      moduleName="RestaurantePro"
      moduleIcon={<Utensils />}
      navItems={navItems as any}
      renderContent={renderContent}
      accentColor="rose"
      setupOptions={setupOptions}
      defaultView="tables"
    />
  );
};
