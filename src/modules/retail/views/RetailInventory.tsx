import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  Tag, 
  Box, 
  Layers,
  Palette,
  Maximize2,
  MoreVertical,
  ChevronRight,
  TrendingDown,
  AlertCircle,
  Calendar,
  ShieldAlert,
  ClipboardList,
  Clock,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';
import { productRepository } from '../../../core/storage/repositories/productRepository';
import { retailService, RetailSyncStatus } from '../services/retailService';

interface RetailProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  batch?: string;
  expirationDate?: number;
  variations?: { size?: string, color?: string, stock: number }[];
  tags: string[];
  lastRestock: number;
}

const MOCK_PRODUCTS: RetailProduct[] = [
  {
    id: 'rp-1',
    name: 'Camiseta Premium Cotton',
    category: 'Vestuário',
    price: 89.90,
    stock: 42,
    minStock: 10,
    batch: 'BT-2023-001',
    tags: ['Promoção', 'Novo'],
    lastRestock: Date.now() - 1000 * 60 * 60 * 24 * 5,
    variations: [
      { size: 'P', color: 'Branco', stock: 12 },
      { size: 'M', color: 'Branco', stock: 15 },
      { size: 'G', color: 'Preto', stock: 15 }
    ]
  },
  {
    id: 'rp-2',
    name: 'Smartphone Nexus Pro',
    category: 'Eletrônicos',
    price: 3499.00,
    stock: 8,
    minStock: 5,
    batch: 'SN-2024-X1',
    tags: ['Eletrônicos', 'Premium'],
    lastRestock: Date.now() - 1000 * 60 * 60 * 24 * 20,
    variations: [
      { color: 'Grafite', stock: 5 },
      { color: 'Prata', stock: 3 }
    ]
  },
  {
    id: 'rp-3',
    name: 'Garrafa Térmica 1L',
    category: 'Casa & Cozinha',
    price: 159.00,
    stock: 4,
    minStock: 10,
    batch: 'HM-2023',
    expirationDate: Date.now() + 1000 * 60 * 60 * 24 * 5, // 5 days from now
    tags: ['Cura'],
    lastRestock: Date.now() - 1000 * 60 * 60 * 24 * 45
  },
  {
    id: 'rp-4',
    name: 'Suplemento Vitamínico',
    category: 'Saúde',
    price: 120.00,
    stock: 25,
    minStock: 5,
    batch: 'VIT-L90',
    expirationDate: Date.now() - 1000 * 60 * 60 * 24 * 2, // Expired 2 days ago
    tags: ['Especial'],
    lastRestock: Date.now() - 1000 * 60 * 60 * 24 * 10
  }
];

export const RetailInventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [products, setProducts] = useState<RetailProduct[]>(MOCK_PRODUCTS);
  const [syncStatus, setSyncStatus] = useState<RetailSyncStatus>({
    connected: false,
    pendingCount: 0,
    lastAttemptAt: null,
    lastSuccessAt: null,
    isRetrying: false,
    resentInSession: 0,
    recentEvents: [],
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadRealtimeProducts = async () => {
      const persistedProducts = await productRepository.findAll();
      if (!isMounted) return;

      if (persistedProducts.length === 0) {
        setProducts(MOCK_PRODUCTS);
        return;
      }

      const existingProducts = persistedProducts.map((product) => ({
        ...product,
        stock: Number(product.stock || 0),
        price: Number(product.price || 0),
      }));

      const seedProducts = MOCK_PRODUCTS.filter((mock) =>
        !persistedProducts.some(
          (product) =>
            product.id === mock.id ||
            product.name.trim().toLowerCase() === mock.name.trim().toLowerCase()
        )
      );

      setProducts([...existingProducts, ...seedProducts]);
    };

    const onSaleUpdated = () => {
      void loadRealtimeProducts();
    };

    void loadRealtimeProducts();
    window.addEventListener('retail:sale-updated', onSaleUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('retail:sale-updated', onSaleUpdated);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSyncStatus = async () => {
      const status = await retailService.getSyncQueueStatus();
      if (isMounted) {
        setSyncStatus(status);
      }
    };

    const onSyncStatus = (event: Event) => {
      const detail = (event as CustomEvent<RetailSyncStatus>).detail;
      if (!detail || !isMounted) return;
      setSyncStatus(detail);
    };

    void loadSyncStatus();
    window.addEventListener('retail:sync-status', onSyncStatus as EventListener);
    const syncPolling = window.setInterval(() => {
      void loadSyncStatus();
    }, 5000);

    return () => {
      isMounted = false;
      window.removeEventListener('retail:sync-status', onSyncStatus as EventListener);
      window.clearInterval(syncPolling);
    };
  }, []);

  const handleManualSync = async () => {
    if (isManualSyncing || syncStatus.isRetrying) return;
    setIsManualSyncing(true);
    try {
      const status = await retailService.syncNow();
      setSyncStatus(status);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-3xl font-black text-slate-800 tracking-tight">Catálogo de Produtos</h2>
           <p className="text-slate-500 font-medium">Gestão de estoque, variantes e preços</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all">
              Imp. Planilha
           </button>
           <button className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">
              <Plus className="w-4 h-4" /> Novo Produto
           </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", syncStatus.connected ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
            {syncStatus.connected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sync Estoque</p>
            <p className="text-sm font-black text-slate-800">
              {syncStatus.connected ? "Conectado em tempo real" : "Offline - sincronização pendente"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Pendentes: {syncStatus.pendingCount}
          </p>
          <button
            onClick={() => void handleManualSync()}
            disabled={isManualSyncing || syncStatus.isRetrying}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", (isManualSyncing || syncStatus.isRetrying) && "animate-spin")} />
            Sincronizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group">
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total em gado</p>
               <p className="text-3xl font-black text-slate-800 tracking-tighter">{products.length} SKUs</p>
            </div>
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
               <Box className="w-8 h-8" />
            </div>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center justify-between group">
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Variantes Totais</p>
               <p className="text-3xl font-black text-slate-800 tracking-tighter">{products.reduce((sum, p) => sum + Number(p.stock || 0), 0)} Unidades</p>
            </div>
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
               <Layers className="w-8 h-8" />
            </div>
         </div>
         <div className="bg-white p-8 rounded-[2.5rem] border border-rose-100 shadow-sm flex items-center justify-between group relative overflow-hidden">
            <div className="relative z-10">
               <p className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-1">Reposição Necessária</p>
               <p className="text-3xl font-black text-rose-600 tracking-tighter">{products.filter((p) => p.stock <= p.minStock).length} Itens</p>
            </div>
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10">
               <TrendingDown className="w-8 h-8" />
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-rose-50 rounded-full blur-3xl opacity-50" />
         </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="text" 
                placeholder="Buscar por nome, SKU, código de barras ou tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-[1.5rem] py-4 pl-14 pr-6 font-bold outline-none transition-all"
              />
           </div>
           <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 font-sans">
              {['all', 'Vestuário', 'Eletrônicos', 'Casa & Cozinha'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                    selectedCategory === cat ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-400 hover:text-slate-600"
                  )}
                >
                  {cat === 'all' ? 'Ver Todos' : cat}
                </button>
              ))}
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produto</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lote / Validade</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estoque</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => {
                const isLowStock = p.stock <= p.minStock;
                const isNearExpiration = p.expirationDate && (p.expirationDate - Date.now() < 1000 * 60 * 60 * 24 * 7); // 7 days
                const isExpired = p.expirationDate && p.expirationDate < Date.now();

                return (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center p-2">
                          <img src={`https://picsum.photos/seed/${p.id}/60/60`} className="rounded-xl w-full h-full object-cover" referrerPolicy="no-referrer" />
                       </div>
                       <div>
                         <p className="font-black text-slate-800 uppercase text-xs tracking-tight">{p.name}</p>
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{p.category}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                     <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                           <Layers className="w-3 h-3 text-slate-300" />
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.batch || 'S/ Lote'}</span>
                        </div>
                        {p.expirationDate && (
                           <div className="flex items-center gap-1.5">
                              <Calendar className={cn(
                                "w-3 h-3",
                                isExpired ? "text-rose-500" : isNearExpiration ? "text-amber-500" : "text-slate-300"
                              )} />
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                isExpired ? "text-rose-500" : isNearExpiration ? "text-amber-500" : "text-slate-500"
                              )}>
                                {format(p.expirationDate, "dd/MM/yy")}
                              </span>
                           </div>
                        )}
                     </div>
                  </td>
                  <td className="px-10 py-8 font-black text-slate-800 text-sm">
                    {formatCurrency(p.price)}
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex flex-col gap-1.5">
                       <div className="flex items-center justify-between gap-4 max-w-[120px]">
                          <span className={cn(
                            "text-xs font-black",
                            isLowStock ? "text-rose-500" : "text-emerald-500"
                          )}>{p.stock} UN</span>
                          <span className="text-[10px] font-black text-slate-300">/ {p.minStock}</span>
                       </div>
                       <div className="w-[120px] h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn(
                            "h-full rounded-full transition-all duration-700",
                            isLowStock ? "bg-rose-500" : "bg-emerald-500"
                          )} style={{ width: `${Math.min((p.stock / (p.minStock * 4)) * 100, 100)}%` }} />
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                     <div className="flex flex-wrap gap-2">
                        {isLowStock && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[8px] font-black uppercase tracking-widest animate-pulse border border-rose-100">
                             <AlertCircle className="w-2.5 h-2.5" /> Estoque Baixo
                          </div>
                        )}
                        {isExpired && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[8px] font-black uppercase tracking-widest border border-rose-200">
                             <ShieldAlert className="w-2.5 h-2.5" /> Vencido
                          </div>
                        )}
                        {!isExpired && isNearExpiration && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[8px] font-black uppercase tracking-widest border border-amber-100">
                             <Clock className="w-2.5 h-2.5" /> Vence em breve
                          </div>
                        )}
                        {!isLowStock && !isNearExpiration && !isExpired && (
                          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-100">
                             <Package className="w-2.5 h-2.5" /> Estável
                          </div>
                        )}
                     </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button className="p-3 bg-white text-slate-400 border border-slate-100 rounded-xl hover:text-indigo-600 transition-all shadow-sm"><Maximize2 className="w-4 h-4" /></button>
                       <button className="p-3 bg-white text-slate-400 border border-slate-100 rounded-xl hover:text-blue-600 transition-all shadow-sm"><MoreVertical className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
