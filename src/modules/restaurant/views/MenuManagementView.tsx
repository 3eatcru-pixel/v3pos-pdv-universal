import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  X, 
  Image as ImageIcon,
  AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../../../lib/utils';
import { useCollection } from '../../../hooks/useCollection';
import { accountService } from '../../../core/services/accountService';
import { firebaseService } from '../../../services/firebaseService';
import { Product, InventoryItem } from '../../../types';

export const MenuManagementView: React.FC = () => {
  const selectedShopId = accountService.getSelectedShopId();
  const enterpriseId = accountService.getCurrentCompanyId();

  const { data: products } = useCollection<Product>('products', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });
  const { data: inventory } = useCollection<InventoryItem>('inventory', { enterpriseId: enterpriseId || null, shopId: selectedShopId || null });

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productCategories, setProductCategories] = useState(['Pratos Principais', 'Bebidas', 'Sobremesas', 'Entradas', 'Bar']);

  const calculateProductCost = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || !product.ingredients) return 0;
    
    let totalCost = 0;
    Object.entries(product.ingredients).forEach(([itemId, qty]) => {
      const item = inventory.find(i => i.id === itemId);
      if (item) {
        totalCost += item.costPerUnit * (qty as number);
      }
    });
    return totalCost;
  };

  const handleSaveProduct = async (productData: Partial<Product>) => {
    if (editingProduct) {
      await firebaseService.updateItem('products', editingProduct.id, { ...productData, enterpriseId });
    } else {
      const id = `p${Math.random().toString(36).substr(2, 9)}`;
      const newProduct: Product = {
        id,
        enterpriseId: enterpriseId!,
        shopId: selectedShopId || 'shop-1',
        active: true,
        ...productData
      } as Product;
      await firebaseService.saveItem('products', id, newProduct);
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Remover este produto?")) {
      await firebaseService.deleteItem('products', id);
    }
  };

  const handleAddCategory = (type: 'product' | 'inventory', category: string) => {
    if (type === 'product') setProductCategories(prev => [...new Set([...prev, category])]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cardápio & Produtos</h2>
          <p className="text-sm text-slate-500">Gerencie os itens disponíveis no POS</p>
        </div>
        <button 
          onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }}
          className="bg-emerald-500 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-400 transition-all shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      <div className="sleek-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-16">Foto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Produto</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Preço / Custo</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Margem</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estoque</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map(product => {
                const theoreticalCost = calculateProductCost(product.id);
                const margin = theoreticalCost > 0 ? ((product.price - theoreticalCost) / product.price) * 100 : 0;
                
                return (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center">
                      {product.image ? (
                        <img src={product.image} referrerPolicy="no-referrer" alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-800 text-sm leading-tight">{product.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{product.category}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-mono font-black text-xs text-emerald-600">{formatCurrency(product.price)}</span>
                      <span className="font-mono text-[9px] text-slate-400">Custo: {formatCurrency(theoreticalCost)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {theoreticalCost > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <div className={cn(
                          "w-1 h-3 rounded-full",
                          margin > 70 ? "bg-emerald-500" : margin > 40 ? "bg-amber-500" : "bg-red-500"
                        )} />
                        <span className="font-mono text-xs font-bold text-slate-600">{margin.toFixed(1)}%</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sem Receita</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 tracking-tighter">{product.stock || 0} un.</td>
                  <td className="px-6 py-4">
                     <div className={cn(
                       "w-2 h-2 rounded-full",
                       product.active ? "bg-emerald-500" : "bg-slate-300"
                     )} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }}
                        className="text-slate-400 hover:text-emerald-500 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                 <h3 className="text-lg font-bold text-slate-800">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                 <button onClick={() => setIsProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="overflow-y-auto p-6">
                <form 
                  id="product-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveProduct({
                      name: formData.get('name') as string,
                      price: parseFloat(formData.get('price') as string),
                      category: formData.get('category') as string,
                      stock: parseFloat(formData.get('stock') as string || '0'),
                      wastageMargin: parseFloat(formData.get('wastageMargin') as string || '0'),
                      image: formData.get('image') as string,
                      active: true
                    });
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Nome do Produto</label>
                    <input name="name" defaultValue={editingProduct?.name} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-semibold text-slate-700" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Preço Venda (R$)</label>
                      <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Margem de Erro (%)</label>
                      <input name="wastageMargin" type="number" step="0.1" defaultValue={editingProduct?.wastageMargin || 5} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Estoque</label>
                      <input name="stock" type="number" defaultValue={editingProduct?.stock} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">URL da Imagem (1:1)</label>
                      <input name="image" defaultValue={editingProduct?.image} placeholder="https://..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Categoria</label>
                    <div className="flex gap-2">
                        <select name="category" defaultValue={editingProduct?.category} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none font-medium text-slate-600">
                          {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <button 
                          type="button" 
                          onClick={() => {
                            const newCat = prompt("Nova categoria de produto:");
                            if (newCat) handleAddCategory('product', newCat);
                          }}
                          className="bg-slate-100 p-3 rounded-xl text-slate-400 hover:text-emerald-500 transition-colors border border-slate-200 shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                  {editingProduct && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between px-1">
                        <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest">Ficha Técnica (Ingredientes)</span>
                        <button 
                          type="button"
                          onClick={() => {
                             const itemId = prompt("ID do insumo ou nome aproximado:");
                             if (!itemId) return;
                             const item = inventory.find(i => i.name.toLowerCase().includes(itemId.toLowerCase()) || i.id === itemId);
                             if (item) {
                                const qty = prompt(`Quantidade de ${item.name} (${item.unit}):`, "1");
                                if (qty) {
                                    const newIngs = { ...(editingProduct.ingredients || {}), [item.id]: parseFloat(qty) };
                                    handleSaveProduct({ ...editingProduct, ingredients: newIngs });
                                }
                             } else { alert("Insumo não encontrado."); }
                          }}
                          className="text-[10px] font-black text-emerald-600 uppercase hover:underline"
                        >
                          + Adicionar Insumo
                        </button>
                      </div>
                      
                      {editingProduct.ingredients && Object.keys(editingProduct.ingredients).length > 0 ? (
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                          {Object.entries(editingProduct.ingredients).map(([id, qty]) => {
                            const item = inventory.find(i => i.id === id);
                            return (
                              <div key={id} className="p-3 flex items-center justify-between group hover:bg-white transition-all">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-slate-700">{item?.name || 'Insumo'}</span>
                                  <span className="text-[9px] text-slate-400 font-bold uppercase">{item?.unit} • {formatCurrency(item?.costPerUnit || 0)}/un</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-mono text-emerald-600 font-bold">{qty}</span>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                       const newIngs = { ...editingProduct.ingredients };
                                       delete newIngs[id];
                                       handleSaveProduct({ ...editingProduct, ingredients: newIngs });
                                    }}
                                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Nenhum ingrediente vinculado.</p>
                        </div>
                      )}
                      
                      <div className="bg-slate-900 p-4 rounded-2xl shadow-xl shadow-slate-900/10 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Custo Insumos</p>
                          <p className="text-sm font-black text-white">{formatCurrency(calculateProductCost(editingProduct.id))}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Margem Real</p>
                           <p className="text-sm font-black text-emerald-400">
                             {calculateProductCost(editingProduct.id) > 0 ? (((editingProduct.price - calculateProductCost(editingProduct.id)) / editingProduct.price) * 100).toFixed(0) : 0}%
                           </p>
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button 
                  type="submit" 
                  form="product-form"
                  className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-emerald-400 transition-all text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                >
                  Salvar Produto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
