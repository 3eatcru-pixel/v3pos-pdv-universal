import { integrationLayer } from '../../../integration/integrationLayer';
import { meshNetwork } from '../../../services/p2pSync';
import { SyncEvent } from '../../../core/types';

export interface Sector {
  id: string;
  name: string;
  requiresWeight: boolean;
  requiresExpiration: boolean;
  hasWarranty: boolean;
}

export interface MarketProduct {
  id: string;
  barcode: string;
  name: string;
  sectorId: string;
  price: number;
  unit: 'un' | 'kg';
  stock: number;
}

export interface Batch {
  productId: string;
  quantity: number;
  expirationDate: number;
  receivedAt: number;
  lotNumber: string;
}

export interface InventoryAlert {
  id: string;
  productId: string;
  type: 'expired' | 'expiring_soon' | 'low_stock';
  message: string;
  createdAt: number;
}

export interface SalesMetrics {
  totalDay: number;
  averageTicket: number;
  peakHour: string;
  topSectors: { sector: string, value: number }[];
}

class MarketService {
  constructor() {
    this.registerSyncListeners();
  }

  registerSyncListeners() {
    meshNetwork.setOnSync((event: SyncEvent) => {
      switch (event.type) {
        case 'MARKET_SALE':
          this.handleMarketSale(event.payload);
          break;
        case 'STOCK_TRANSFER':
          this.handleStockTransfer(event.payload);
          break;
      }
    });
  }

  async processBarcodeScan(barcode: string) {
    // Future integration with product DB or legacy scanner API
    console.log('[MARKET] Scanned barcode:', barcode);
    return { barcode, timestamp: Date.now() };
  }

  async processSale(saleData: any) {
    // 1. P2P Sync
    meshNetwork.broadcast('MARKET_SALE', saleData);
    
    // 2. Persistent Storage through Integration
    return await integrationLayer.registerSale('market', saleData, saleData.items);
  }

  findProductByBarcode(barcode: string) {
    // Simulated database lookup
    const products = [
      { id: 'p1', name: 'Leite Integral', price: 5.50, barcode: '789123', unit: 'un' },
      { id: 'p2', name: 'Pão de Forma', price: 8.90, barcode: '789456', unit: 'un' },
      { id: 'p3', name: 'Café 500g', price: 18.50, barcode: '789789', unit: 'un' },
    ];
    return products.find(p => p.barcode === barcode);
  }

  async recordWaste(productId: string, quantity: number, reason: string) {
    await integrationLayer.sendLog('market', 'Recorded product waste', { productId, quantity, reason });
  }

  private handleMarketSale(payload: any) {
    console.log('[MARKET] Syncing supermarket sale', payload.id);
  }

  private handleStockTransfer(payload: any) {
    console.log('[MARKET] Stock transfer received', payload);
  }
}

export const marketService = new MarketService();
