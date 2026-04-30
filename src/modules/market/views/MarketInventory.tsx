import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  AlertCircle, 
  Box, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Zap,
  X,
  Scan,
  Tag,
  Monitor,
  Scale as ScaleIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { Product } from '../../../types';
import { firebaseService } from '../../../services/firebaseService';
import { accountService } from '../../../core/services/accountService';

export const MarketInventory: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [countQuantity, setCountQuantity] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'add' | 'set'>('set');
  
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    category: 'Mercearia',
    price: 0,
    stock: 0,
    unit: 'un',
    barcode: '',
    active: true,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const entId = accountService.getCurrentCompanyId();
      const sId = accountService.getSelectedShopId();
      const data = await firebaseService.getAllDocs('products', entId || undefined, sId || undefined);
      setProducts(data as Product[]);
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = (barcode: string) => {
    setScannedBarcode(barcode);
    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
      setScannedProduct(product);
      setCountQuantity(product.stock?.toString() || '0');
      setAdjustType('set');
      setShowCountModal(true);
    } else {
      setShowNotFoundModal(true);
    }
  };

  const handleUpdateStock = async () => {
    if (!scannedProduct) return;
    
    const qty = parseFloat(countQuantity);
    if (isNaN(qty)) return;

    const newStock = adjustType === 'set' ? qty : (scannedProduct.stock || 0) + qty;

    try {
      const entId = accountService.getCurrentCompanyId();
      const sId = accountService.getSelectedShopId();
      await firebaseService.saveItem('products', scannedProduct.id, { ...scannedProduct, stock: newStock, enterpriseId: entId, shopId: sId });
      setShowCountModal(false);
      setScannedProduct(null);
      loadProducts();
    } catch (err) {
      console.error('Error updating stock:', err);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.barcode) {
      alert('Preencha os campos obrigatórios (Nome, Preço, Barcode)');
      return;
    }

    try {
      const entId = accountService.getCurrentCompanyId();
      const sId = accountService.getSelectedShopId();
      await firebaseService.addItem('products', { ...newProduct, enterpriseId: entId, shopId: sId } as Product);
      setShowAddModal(false);
      setNewProduct({
        name: '',
        category: 'Mercearia',
        price: 0,
        stock: 0,
        unit: 'un',
        barcode: '',
        active: true,
      });
      loadProducts();
    } catch (err) {
      console.error('Error saving product:', err);
    }
  };

  const getUrgency = (exp?: number) => {
    if (!exp) return 'none';
    const diff = exp - Date.now();
    if (diff < 0) return 'expired';
    if (diff < 1000 * 60 * 60 * 24 * 3) return 'warning';
    return 'safe';
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Master Inventory</h2>
           <p className="text-slate-500 font-medium font-sans">Controle de lotes, datas de vencimento e perecíveis</p>
        </div>
        <div className="flex gap-4">
            <button className="px-8 py-5 bg-white border-2 border-slate-100 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center gap-3">
               <Zap className="w-4 h-4" /> Ajuste em Massa
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all shadow-2xl shadow-slate-200"
            >
               <Plus className="w-5 h-5" /> Adicionar Lote / Novo Item
            </button>
         </div>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden font-sans"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 rounded-2xl text-white">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic">Novo Produto no Estoque</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-3 text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Nome do Produto</label>
                    <input 
                      type="text" 
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                      placeholder="Ex: Leite Integral 1L"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Preço de Venda (R$)</label>
                    <input 
                      type="number" 
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: parseFloat(e.target.value)})}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Código de Barras (EAN)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={newProduct.barcode}
                        onChange={e => setNewProduct({...newProduct, barcode: e.target.value})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 px-12 font-bold outline-none transition-all"
                        placeholder="789..."
                      />
                      <Scan className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Estoque Inicial</label>
                    <input 
                      type="number" 
                      value={newProduct.stock}
                      onChange={e => setNewProduct({...newProduct, stock: parseFloat(e.target.value)})}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 px-12 font-bold outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Unidade</label>
                    <select 
                      value={newProduct.unit}
                      onChange={e => setNewProduct({...newProduct, unit: e.target.value as any})}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                    >
                      <option value="un">Unidade (un)</option>
                      <option value="kg">Quilo (kg)</option>
                      <option value="lt">Litro (lt)</option>
                      <option value="g">Grama (g)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-10 pt-0">
                <button 
                  onClick={handleSaveProduct}
                  className="w-full py-6 bg-emerald-600 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5" /> Confirmar Cadastro de Lote
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showCountModal && scannedProduct && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden font-sans"
            >
              <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500 rounded-2xl text-white">
                    <ScaleIcon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic">Contagem de Estoque</h3>
                </div>
                <button onClick={() => setShowCountModal(false)} className="p-3 text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 space-y-8">
                <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden">
                    {scannedProduct.image ? (
                      <img src={scannedProduct.image} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Package className="w-8 h-8 text-slate-200" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase leading-tight">{scannedProduct.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{scannedProduct.barcode}</p>
                    <p className="text-[10px] font-black text-emerald-600 uppercase mt-1">Estoque Atual: {scannedProduct.stock} {scannedProduct.unit?.toUpperCase()}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex p-1 bg-slate-100 rounded-2xl">
                    <button 
                      onClick={() => setAdjustType('set')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        adjustType === 'set' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                      )}
                    >
                      Substituir Total
                    </button>
                    <button 
                      onClick={() => setAdjustType('add')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        adjustType === 'add' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                      )}
                    >
                      Adicionar ao Atual
                    </button>
                  </div>

                  <div className="relative">
                    <input 
                      type="number" 
                      value={countQuantity}
                      autoFocus
                      onChange={e => setCountQuantity(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 rounded-[2rem] py-8 px-10 text-4xl font-black outline-none transition-all text-center"
                    />
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20">
                      {adjustType === 'set' ? <Monitor className="w-10 h-10" /> : <Plus className="w-10 h-10" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 pt-0">
                <button 
                  onClick={handleUpdateStock}
                  className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-sm hover:bg-black transition-all shadow-2xl flex items-center justify-center gap-4"
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" /> Salvar Nova Quantidade
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showNotFoundModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden font-sans border-t-8 border-rose-500"
            >
              <div className="p-10 space-y-8 text-center">
                <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter italic text-slate-800">Produto não Encontrado</h3>
                  <p className="text-slate-400 font-bold mt-2 text-sm">O código <span className="text-slate-900">{scannedBarcode}</span> não está cadastrado em nosso mestre de inventário.</p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => {
                      setNewProduct({ ...newProduct, barcode: scannedBarcode });
                      setShowNotFoundModal(false);
                      setShowAddModal(true);
                    }}
                    className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl shadow-slate-100 flex items-center justify-center gap-3"
                  >
                    <Plus className="w-5 h-5 text-emerald-400" /> Criar Novo Produto
                  </button>
                  <button 
                    onClick={() => {
                      setShowNotFoundModal(false);
                      setSearch(scannedBarcode);
                    }}
                    className="w-full py-6 bg-slate-100 text-slate-600 rounded-[2rem] font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
                  >
                    <Search className="w-5 h-5" /> Pesquisar Existente
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                <button onClick={() => setShowNotFoundModal(false)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-rose-500 transition-all">
                  Cancelar Operação
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm group font-sans">
            <div className="flex items-center justify-between mb-8">
               <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Box className="w-8 h-8" />
               </div>
               <span className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">Sincronizado</span>
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 italic">Total Itens</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">{products.length} SKUs</h3>
         </div>

         <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm group font-sans">
            <div className="flex items-center justify-between mb-8">
               <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-8 h-8" />
               </div>
               <span className="text-[10px] font-black uppercase text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">Vencendo Logo</span>
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 italic">Perecíveis Proximos</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic">14 Lotes</h3>
         </div>

         <div className="bg-rose-600 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group font-sans">
            <div className="relative z-10">
               <div className="flex items-center justify-between mb-8">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                     <AlertCircle className="w-8 h-8 text-white" />
                  </div>
               </div>
               <p className="text-[10px] font-black uppercase text-rose-100 tracking-widest mb-1 italic">Vencidos (Descartar)</p>
               <h3 className="text-4xl font-black text-white tracking-tighter italic">03 Itens</h3>
            </div>
            <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
         </div>
      </div>

      <div className="flex gap-10">
         <div className="flex-1 space-y-10">
            <div className="bg-white rounded-[4rem] p-4 border border-slate-100 shadow-sm relative overflow-hidden group">
               <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
               <BarcodeScanner onScan={handleScan} />
               <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none">
                  <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[8px] font-black uppercase tracking-[0.2em] shadow-lg animate-pulse">
                     Modo Contagem Ativo
                  </div>
                  <Scan className="w-6 h-6 text-slate-300" />
               </div>
            </div>

            <div className="bg-white rounded-[4rem] border border-slate-100 shadow-sm overflow-hidden font-sans">
              <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-slate-50/50">
                <div className="relative flex-1 max-w-lg font-sans">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      type="text" 
                      placeholder="Pesquisar por Código, Descrição ou Categoria..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full bg-white border-2 border-transparent focus:border-emerald-500 rounded-3xl py-5 pl-14 pr-6 font-bold outline-none transition-all shadow-sm"
                    />
                </div>
                
                <div className="flex items-center gap-3 overflow-x-auto pb-4 md:pb-0">
                    {['all', 'Perecíveis', 'Mercearia', 'Hortifruti', 'Padaria', 'Açougue'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={cn(
                          "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                          filter === cat ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "bg-white text-slate-400 hover:text-slate-700 shadow-sm border border-slate-100"
                        )}
                        title={`Filtrar por ${cat === 'all' ? 'todas as categorias' : cat}`}
                      >
                        {cat === 'all' ? 'Ver Todas as Categorias' : cat}
                      </button>
                    ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                      <tr>
                        <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">EAN / Produto</th>
                        <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">Status Validade</th>
                        <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 text-right">Estoque Real</th>
                        <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 text-right">M.V.P</th>
                        <th className="px-12 py-8 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products
                        .filter(p => filter === 'all' || p.category === filter)
                        .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search))
                        .map((p) => {
                        const urgency = getUrgency(p.expiration);
                        return (
                          <tr key={p.id} className="group border-b border-slate-50 hover:bg-slate-50/50 transition-all">
                            <td className="px-12 py-10 border-b border-slate-50">
                                <div className="flex items-center gap-6">
                                  <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center p-3">
                                      {p.image ? (
                                        <img src={p.image} className="w-full h-full object-contain rounded-xl mix-blend-multiply" referrerPolicy="no-referrer" />
                                      ) : (
                                        <Package className="w-8 h-8 text-slate-300" />
                                      )}
                                  </div>
                                  <div>
                                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{p.name}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                                            <Scan className="w-2.5 h-2.5" /> {p.barcode}
                                        </span>
                                        <span className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded">
                                            {p.category}
                                        </span>
                                      </div>
                                  </div>
                                </div>
                            </td>
                            <td className="px-12 py-10 border-b border-slate-50">
                                {p.expiration ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        {urgency === 'expired' ? <AlertCircle className="w-4 h-4 text-rose-500" /> : 
                                        urgency === 'warning' ? <Clock className="w-4 h-4 text-amber-500" /> : 
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                        <span className={cn(
                                          "text-xs font-black uppercase italic",
                                          urgency === 'expired' ? "text-rose-500" : urgency === 'warning' ? "text-amber-600" : "text-emerald-600"
                                        )}>
                                          {urgency === 'expired' ? 'Vencido' : 
                                            urgency === 'warning' ? 'Vencendo em breve' : 'Válido'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400">
                                        {new Date(p.expiration).toLocaleDateString()}
                                    </p>
                                  </div>
                                ) : <span className="text-xs font-bold text-slate-300 italic">Não Aplicável</span>}
                            </td>
                            <td className="px-12 py-10 border-b border-slate-50 text-right">
                                <p className="text-sm font-black text-slate-800 tracking-tight">{p.stock} <span className="text-[10px] opacity-40 italic">{p.unit?.toUpperCase()}</span></p>
                                <div className="w-24 h-1 bg-slate-100 rounded-full mt-2 ml-auto overflow-hidden">
                                  <div className={cn(
                                    "h-full rounded-full transition-all",
                                    (p.stock || 0) < 10 ? "bg-rose-500" : "bg-emerald-500"
                                  )} style={{ width: `${Math.min(100, ((p.stock || 0)/100)*100)}%` }} />
                                </div>
                            </td>
                            <td className="px-12 py-10 border-b border-slate-50 text-right font-black text-slate-800">
                                {formatCurrency(p.price)}
                            </td>
                            <td className="px-12 py-10 border-b border-slate-50 text-right">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => {
                                        setScannedProduct(p);
                                        setCountQuantity(p.stock?.toString() || '0');
                                        setAdjustType('set');
                                        setShowCountModal(true);
                                      }}
                                      className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-emerald-600 shadow-sm transition-all"
                                    >
                                      <ScaleIcon className="w-4 h-4" />
                                    </button>
                                    <button className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all">
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                </table>
              </div>
            </div>
         </div>
      </div>
    </div>
  );
};
