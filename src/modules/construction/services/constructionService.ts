import { integrationLayer } from '../../../integration/integrationLayer';
import { CoreProduct, SyncEvent, CustomFieldDefinition } from '../../../core/types';
import { meshNetwork } from '../../../services/p2pSync';

export interface Quote {
  id: string;
  clientId: string;
  clientName: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: 'kg' | 'm' | 'un' | 'saco' | 'metro' | 'm3' | 'centena' | 'milheiro' | 'm²';
    priceAtTime: number;
  }>;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'billed';
  total: number;
  createdAt: number;
}

export interface ConstructionProject {
  id: string;
  name: string;
  clientName: string;
  address: string;
  startDate: number;
  status: 'planning' | 'in_progress' | 'paused' | 'completed';
  progress: number; // 0-100
  budget: number;
  spent: number;
  engineer: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  notes?: string;
  type: 'individual' | 'company';
  document?: string; // CPF or CNPJ
  createdAt: number;
}

export interface DeliveryCrate {
  id: string;
  projectId: string;
  orderId: string;
  items: any[];
  status: 'preparing' | 'dispatched' | 'delivered' | 'delayed';
  vehicleId?: string;
  driverName?: string;
  estimatedArrival: number;
}

export type MaterialCategory = 
  | 'structural' 
  | 'electric' 
  | 'hydraulic' 
  | 'finishing' 
  | 'tools' 
  | 'masonry' // Pedras, areia
  | 'hardware' // Parafusos, pregos
  | 'lumber' // Madeiras
  | 'paint';

export interface ConstructionMaterial {
  id: string;
  name: string;
  category: MaterialCategory;
  section: string;
  stock: number;
  unit: 'kg' | 'm' | 'un' | 'saco' | 'metro' | 'm3' | 'centena' | 'milheiro' | 'm²';
  minStock: number;
  price: number;
  cost: number;
  image?: string;
  brand?: string;
  createdAt: number;
  customFields?: Record<string, any>;
}

class ConstructionService {
  private customers: Customer[] = [
    { id: 'c1', name: 'João Silva', address: 'Rua das Flores, 123', phone: '1199999999', type: 'individual', notes: 'Entrega preferencial pela manhã', createdAt: Date.now() },
    { id: 'c2', name: 'Construtora Forte', address: 'Av. Industrial, 500', phone: '1133334444', type: 'company', document: '12.345.678/0001-90', createdAt: Date.now() },
  ];

  private customFields: CustomFieldDefinition[] = [];

  async getCustomFields() {
    return this.customFields;
  }

  async addCustomField(field: Omit<CustomFieldDefinition, 'id' | 'createdAt'>) {
    const newField: CustomFieldDefinition = {
      ...field,
      id: `cf-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now()
    };
    this.customFields.push(newField);
    meshNetwork.emitEvent('ADD_CUSTOM_FIELD', newField);
    return newField;
  }

  async getCustomers() {
    return this.customers;
  }

  async addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>) {
    const newCustomer = { 
      ...customer, 
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now()
    };
    this.customers.push(newCustomer);
    meshNetwork.emitEvent('ADD_CUSTOMER', newCustomer);
    return newCustomer;
  }
  /**
   * P2P Event Processing
   * This is where a Host or Client reacts to incoming events.
   */
  public registerSyncListeners() {
    meshNetwork.setOnSync((event: SyncEvent) => {
      switch (event.type) {
        case 'UPDATE_STOCK':
          this.handleLocalStockUpdate(event.payload);
          break;
        case 'CREATE_SALE':
          this.handleIncomingSale(event.payload);
          break;
        case 'REGISTER_DELIVERY':
          this.handleDeliveryUpdate(event.payload);
          break;
      }
    });
  }

  async createQuote(quote: Quote) {
    await integrationLayer.sendLog('construction', 'Created new quote', { quoteId: quote.id });
    
    // Broadcast for other salesman or host visibility
    meshNetwork.emitEvent('CREATE_QUOTE', quote);
    
    return { success: true, quoteId: quote.id };
  }

  async approveQuote(quoteId: string) {
    meshNetwork.emitEvent('APPROVE_QUOTE', { quoteId, approvedAt: Date.now() });
  }

  async processSale(saleData: any) {
    // Update local stock immediately for consistency and user feedback
    saleData.items.forEach((item: any) => {
      this.updateStock(item.productId, -item.quantity);
    });

    await integrationLayer.registerSale('construction', saleData, saleData.items);
    meshNetwork.emitEvent('CREATE_SALE', saleData);
  }

  async updateStock(productId: string, delta: number) {
    const payload = { productId, delta, timestamp: Date.now() };
    meshNetwork.emitEvent('UPDATE_STOCK', payload);
  }

  async processDelivery(orderId: string, vehicleId: string) {
    await integrationLayer.sendLog('construction', 'Dispatched delivery', { orderId, vehicleId });
    meshNetwork.emitEvent('REGISTER_DELIVERY', { orderId, vehicleId, status: 'dispatched' });
  }

  // Event Handlers
  private handleLocalStockUpdate(payload: any) {
    console.log('Syncing global stock change:', payload.productId, payload.delta);
    // Integration layer handles core DB updates
    integrationLayer.updateStock('construction', payload.productId, payload.delta);
  }

  private handleIncomingSale(sale: any) {
    console.log('Relaying sale event to core integration:', sale.id);
    integrationLayer.registerSale('construction', sale, sale.items);
  }

  private handleDeliveryUpdate(delivery: any) {
    console.log('Logistics update received:', delivery.orderId, delivery.status);
  }
}

export const constructionService = new ConstructionService();
constructionService.registerSyncListeners();
