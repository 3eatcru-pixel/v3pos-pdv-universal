import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertTriangle,
  Layers,
  MapPin,
  Tag,
  X,
  PlusCircle,
  MinusCircle,
  Clock,
  Info,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';
import { ConstructionMaterial, MaterialCategory, constructionService, CustomFieldDefinition } from '../services/constructionService';

const MOCK_MATERIALS: ConstructionMaterial[] = [
  // Estrutural
  { id: 'mat-1', name: 'Cimento CP II 50kg', category: 'structural', section: 'Setor A - Pallet 04', stock: 250, minStock: 50, unit: 'saco', price: 38.90, cost: 28.00, createdAt: Date.now() },
  { id: 'mat-2', name: 'Vergalhão CA-50 10mm 12m', category: 'structural', section: 'Área Externa - Rack 12', stock: 85, minStock: 20, unit: 'un', price: 94.50, cost: 72.00, createdAt: Date.now() },
  
  // Maçonaria / Pedras / Areia
  { id: 'mat-6', name: 'Areia Lavada Fina', category: 'masonry', section: 'Baia 01', stock: 15, minStock: 5, unit: 'm3', price: 120.00, cost: 85.00, createdAt: Date.now() },
  { id: 'mat-7', name: 'Pedra Brita nº 1', category: 'masonry', section: 'Baia 02', stock: 12, minStock: 4, unit: 'm3', price: 110.00, cost: 78.00, createdAt: Date.now() },
  { id: 'mat-8', name: 'Tijolo Baiano 8 Furos', category: 'masonry', section: 'Setor C', stock: 5000, minStock: 1000, unit: 'milheiro', price: 850.00, cost: 620.00, createdAt: Date.now() },

  // Hidráulica
  { id: 'mat-3', name: 'Tubo PVC Marrom 25mm 6m', category: 'hydraulic', section: 'Corredor B - Prateleira 02', stock: 120, minStock: 30, unit: 'un', price: 18.20, cost: 12.50, createdAt: Date.now() },
  
  // Elétrica
  { id: 'mat-4', name: 'Fio Flexível 2,5mm 100m Azul', category: 'electric', section: 'Elétrica - Gaveta 14', stock: 15, minStock: 10, unit: 'un', price: 245.00, cost: 180.00, createdAt: Date.now() },
  { id: 'mat-9', name: 'Disjuntor Monopolar 20A', category: 'electric', section: 'Elétrica - Gaveta 05', stock: 45, minStock: 15, unit: 'un', price: 14.90, cost: 8.50, createdAt: Date.now() },

  // Ferragens / Parafusos
  { id: 'mat-10', name: 'Parafuso Autobrocante 4.2 x 13', category: 'hardware', section: 'Ferragens - Caixa 42', stock: 2400, minStock: 500, unit: 'un', price: 0.15, cost: 0.08, brand: 'Ciser', createdAt: Date.now() },
  { id: 'mat-11', name: 'Prego com Cabeça 17x21', category: 'hardware', section: 'Ferragens - Saco', stock: 25, minStock: 5, unit: 'kg', price: 22.50, cost: 14.00, createdAt: Date.now() },

  // Acabamento
  { id: 'mat-5', name: 'Piso Porcelanato 80x80cm Polido', category: 'finishing', section: 'Showroom - Lote E3', stock: 1400, minStock: 200, unit: 'm²', price: 115.00, cost: 82.00, createdAt: Date.now() },
];

export const ConstructionInventory: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [materialToPrint, setMaterialToPrint] = useState<ConstructionMaterial | null>(null);
  const [materials, setMaterials] = useState<ConstructionMaterial[]>(MOCK_MATERIALS);
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});
  
  const [newMaterial, setNewMaterial] = useState<Omit<ConstructionMaterial, 'id' | 'createdAt'>>({
    name: '',
    category: 'structural',
    section: '',
    stock: 0,
    minStock: 10,
    unit: 'un',
    price: 0,
    cost: 0,
    customFields: {}
  });

  useEffect(() => {
    loadCustomFields();
  }, []);

  const loadCustomFields = async () => {
    const fields = await constructionService.getCustomFields();
    setCustomFields(fields);
  };

  const handlePrintLabel = (mat: ConstructionMaterial) => {
    setMaterialToPrint(mat);
    setIsLabelModalOpen(true);
  };

  const executePrint = () => {
    window.print();
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `mat-${Math.random().toString(36).substr(2, 9)}`;
    const material: ConstructionMaterial = { 
      ...newMaterial, 
      id, 
      createdAt: Date.now(),
      customFields: dynamicValues 
    };
    setMaterials([...materials, material]);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewMaterial({
      name: '',
      category: 'structural',
      section: '',
      stock: 0,
      minStock: 10,
      unit: 'un',
      price: 0,
      cost: 0,
      customFields: {}
    });
    setDynamicValues({});
  };

  const handleAdjustStock = (id: string, delta: number) => {
    setMaterials(materials.map(m => 
      m.id === id ? { ...m, stock: Math.max(0, m.stock + delta) } : m
    ));
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || m.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Peças & Estoque</h2>
          <p className="text-slate-500 font-medium">Gestão detalhada de insumos e localização física</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">
            <ArrowDownLeft className="w-4 h-4" /> Registrar Entrada
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
          >
            <Plus className="w-4 h-4" /> Novo Material
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total de SKUs</p>
            <p className="text-xl font-black text-slate-800">1,248 Itens</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor em Estoque</p>
            <p className="text-xl font-black text-slate-800">{formatCurrency(842500)}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Abaixo do Mínimo</p>
            <p className="text-xl font-black text-slate-800">14 Materiais</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center gap-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por nome, SKU ou especificação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-transparent focus:border-blue-500 rounded-xl py-3 pl-12 pr-6 font-medium outline-none transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 font-sans custom-scrollbar">
            {['all', 'structural', 'masonry', 'electric', 'hydraulic', 'hardware', 'finishing', 'tools'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                  filterCategory === cat ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-400 hover:text-slate-600"
                )}
              >
                {cat === 'all' ? 'Ver Todos' : 
                 cat === 'structural' ? 'Estrutual' :
                 cat === 'masonry' ? 'Maçonaria' :
                 cat === 'electric' ? 'Elétrica' :
                 cat === 'hydraulic' ? 'Hidráulica' :
                 cat === 'hardware' ? 'Ferragens' :
                 cat === 'finishing' ? 'Acabamento' : 'Ferramentas'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map(mat => (
              <motion.div 
                layout
                key={mat.id}
                className="group p-6 rounded-[2rem] border border-slate-100 hover:border-blue-200 hover:shadow-xl transition-all relative overflow-hidden"
              >
                {mat.stock <= mat.minStock && (
                  <div className="absolute top-4 right-4 text-rose-500">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-slate-50 text-slate-500 text-[9px] font-black uppercase px-2 py-1 rounded-md">
                      {mat.category}
                    </span>
                    <span className="text-xs font-black text-slate-800">{formatCurrency(mat.price)}/{mat.unit}</span>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{mat.name}</h4>
                    <p className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 mt-1">
                      <MapPin className="w-3 h-3" /> {mat.section}
                    </p>
                    <p className="text-[8px] font-black text-slate-300 flex items-center gap-1 mt-1">
                      <Clock className="w-2.5 h-2.5" /> Reg: {new Date(mat.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {mat.customFields && Object.keys(mat.customFields).length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                       {Object.entries(mat.customFields).map(([key, value]) => (
                         <div key={key} className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 flex items-center gap-2">
                            <span className="text-[8px] font-black text-slate-400 uppercase">{key}:</span>
                            <span className="text-[9px] font-bold text-slate-600">{String(value)}</span>
                         </div>
                       ))}
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase text-slate-400">Nível de Estoque</span>
                      <span className={cn(
                        "text-xs font-black",
                        mat.stock <= mat.minStock ? "text-rose-500" : "text-emerald-500"
                      )}>{mat.stock} {mat.unit}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((mat.stock / (mat.minStock * 4)) * 100, 100)}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          mat.stock <= mat.minStock ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : "bg-emerald-500"
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button 
                      onClick={() => handleAdjustStock(mat.id, -1)}
                      className="py-2.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                    >
                      <MinusCircle className="w-3 h-3" /> Retirar
                    </button>
                    <button 
                      onClick={() => handleAdjustStock(mat.id, 1)}
                      className="py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-3 h-3" /> Adicionar
                    </button>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-50 mt-2 flex items-center justify-between">
                     <button
                        onClick={() => setMaterials(materials.map(m => m.id === mat.id ? { ...m, stock: m.stock > 0 ? 0 : m.minStock + 10 } : m))}
                        className={cn(
                           "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                           mat.stock === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" : "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                        )}
                        title={mat.stock === 0 ? "Restaurar Estoque" : "Esgotar Totalmente"}
                     >
                        {mat.stock === 0 ? 'Restaurar' : 'Esgotar (86)'}
                     </button>
                  </div>
                  <button 
                    onClick={() => handlePrintLabel(mat)}
                    className="w-full py-2.5 mt-2 bg-slate-50 text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-3 h-3" /> Imprimir Etiqueta de Gôndola
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* New Material Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-3xl bg-white rounded-[3rem] shadow-3xl relative z-10 overflow-hidden"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Novo Item de Inventário</h3>
                  <p className="text-slate-500 font-medium text-sm">Registre materiais, ferragens ou acabamentos.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 bg-white text-slate-400 rounded-2xl hover:text-rose-500 transition-colors shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddMaterial} className="p-10 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Nome do Material</label>
                      <input 
                        required
                        type="text" 
                        value={newMaterial.name}
                        onChange={e => setNewMaterial({...newMaterial, name: e.target.value})}
                        placeholder="Ex: Cimento CP II, Parafuso 4x13..."
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Categoria</label>
                      <select 
                        required
                        value={newMaterial.category}
                        onChange={e => setNewMaterial({...newMaterial, category: e.target.value as MaterialCategory})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all appearance-none"
                      >
                        <option value="structural">Estrutural</option>
                        <option value="masonry">Maçonaria / Pedras</option>
                        <option value="electric">Elétrica</option>
                        <option value="hydraulic">Hidráulica</option>
                        <option value="hardware">Ferragens / Fixação</option>
                        <option value="finishing">Acabamento</option>
                        <option value="tools">Ferramentas</option>
                        <option value="lumber">Madeiras</option>
                        <option value="paint">Tintas</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Localização (Seção/Baia)</label>
                      <input 
                        required
                        type="text" 
                        value={newMaterial.section}
                        onChange={e => setNewMaterial({...newMaterial, section: e.target.value})}
                        placeholder="Ex: Corredor A, Prateleira 4"
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Preço de Venda</label>
                        <input 
                          required
                          type="number" 
                          step="0.01"
                          value={newMaterial.price || ''}
                          onChange={e => setNewMaterial({...newMaterial, price: Number(e.target.value)})}
                          placeholder="0,00"
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Custo Unitário</label>
                        <input 
                          required
                          type="number" 
                          step="0.01"
                          value={newMaterial.cost || ''}
                          onChange={e => setNewMaterial({...newMaterial, cost: Number(e.target.value)})}
                          placeholder="0,00"
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Estoque Inicial</label>
                        <input 
                          required
                          type="number" 
                          value={newMaterial.stock || ''}
                          onChange={e => setNewMaterial({...newMaterial, stock: Number(e.target.value)})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Unidade</label>
                        <select 
                          required
                          value={newMaterial.unit}
                          onChange={e => setNewMaterial({...newMaterial, unit: e.target.value as any})}
                          className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all appearance-none"
                        >
                          <option value="un">Unidade</option>
                          <option value="kg">Quilo (kg)</option>
                          <option value="m">Metro (m)</option>
                          <option value="m²">Metro Quadrado (m²)</option>
                          <option value="m3">Metro Cúbico (m³)</option>
                          <option value="saco">Saco</option>
                          <option value="milheiro">Milheiro</option>
                          <option value="centena">Centena</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Estoque Mínimo (Alerta)</label>
                      <input 
                        required
                        type="number" 
                        value={newMaterial.minStock || ''}
                        onChange={e => setNewMaterial({...newMaterial, minStock: Number(e.target.value)})}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {customFields.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-100">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4 mb-4 flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Informações Adicionais (Atributos Customizados)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                       {customFields.map(field => (
                         <div key={field.id} className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-1">
                               {field.name} {field.isRequired && <span className="text-rose-500">*</span>}
                            </label>
                            
                            {field.type === 'text' && (
                              <input 
                                required={field.isRequired}
                                type="text"
                                className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl py-3 px-4 font-bold outline-none transition-all text-xs shadow-sm"
                                onChange={e => setDynamicValues({...dynamicValues, [field.name]: e.target.value})}
                                value={dynamicValues[field.name] || ''}
                              />
                            )}
                            {field.type === 'number' && (
                              <input 
                                required={field.isRequired}
                                type="number"
                                className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl py-3 px-4 font-bold outline-none transition-all text-xs shadow-sm"
                                onChange={e => setDynamicValues({...dynamicValues, [field.name]: Number(e.target.value)})}
                                value={dynamicValues[field.name] || ''}
                              />
                            )}
                            {field.type === 'boolean' && (
                              <div 
                                onClick={() => setDynamicValues({...dynamicValues, [field.name]: !dynamicValues[field.name]})}
                                className={cn(
                                  "w-full cursor-pointer py-3 px-4 rounded-xl border font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all",
                                  dynamicValues[field.name] ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-400"
                                )}
                              >
                                {dynamicValues[field.name] ? 'Sim / Ativo' : 'Não / Inativo'}
                              </div>
                            )}
                            {field.type === 'date' && (
                              <input 
                                required={field.isRequired}
                                type="date"
                                className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl py-3 px-4 font-bold outline-none transition-all text-xs shadow-sm"
                                onChange={e => setDynamicValues({...dynamicValues, [field.name]: e.target.value})}
                                value={dynamicValues[field.name] || ''}
                              />
                            )}
                            {field.type === 'select' && (
                              <select 
                                required={field.isRequired}
                                className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-xl py-3 px-4 font-bold outline-none transition-all text-xs appearance-none shadow-sm"
                                onChange={e => setDynamicValues({...dynamicValues, [field.name]: e.target.value})}
                                value={dynamicValues[field.name] || ''}
                              >
                                <option value="">Selecione...</option>
                                {field.options?.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}
                         </div>
                       ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                  >
                    Salvar no Inventário
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Label Print Modal */}
      <AnimatePresence>
        {isLabelModalOpen && materialToPrint && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white print:backdrop-blur-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-[3rem] shadow-3xl flex flex-col h-auto overflow-hidden print:w-full print:rounded-none print:shadow-none"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden">
                 <div className="flex items-center gap-3">
                    <Printer className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Etiqueta de Gôndola</h3>
                 </div>
                 <div className="flex items-center gap-2">
                    <p className="hidden md:block text-[9px] font-bold text-slate-400 uppercase mr-4">
                      Para PDF: mude o destino da impressora
                    </p>
                    <button 
                      onClick={executePrint}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      Imprimir / PDF
                    </button>
                    <button 
                      onClick={() => setIsLabelModalOpen(false)}
                      className="p-3 bg-white text-slate-400 rounded-xl hover:text-rose-500 transition-colors shadow-sm"
                    >
                      <X className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              <div id="printable-area" className="p-8 print:p-4">
                 <div className="border-4 border-slate-900 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
                    <div className="space-y-1">
                       <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Materiais de Construção</h2>
                       <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-tight">{materialToPrint.name}</h1>
                       {materialToPrint.brand && (
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Marca: {materialToPrint.brand}</p>
                       )}
                    </div>

                    <div className="w-full flex items-center justify-between gap-4 py-4 border-y-2 border-slate-900">
                       <div className="text-left">
                          <p className="text-[8px] font-black uppercase text-slate-400">Preço p/ {materialToPrint.unit}</p>
                          <div className="flex items-baseline gap-1">
                             <span className="text-lg font-black text-slate-900 tracking-tighter">R$</span>
                             <span className="text-4xl font-black text-slate-900 tracking-tighter">
                                {materialToPrint.price.toFixed(2).split('.')[0]}
                             </span>
                             <span className="text-xl font-black text-slate-900 tracking-tighter">
                                ,{materialToPrint.price.toFixed(2).split('.')[1]}
                             </span>
                          </div>
                       </div>
                       <div className="h-12 w-[2px] bg-slate-900"></div>
                       <div className="text-right">
                          <p className="text-[8px] font-black uppercase text-slate-400">Localização</p>
                          <p className="text-xs font-black text-slate-900 uppercase">{materialToPrint.section}</p>
                       </div>
                    </div>

                    <div className="w-full pt-2 flex flex-col items-center">
                       {/* Simulate Barcode */}
                       <div className="flex gap-0.5 mb-1 h-6">
                          {[1,3,1,2,4,1,3,2,1,2,1,4,1].map((w, i) => (
                             <div key={i} className="bg-slate-900" style={{ width: `${w}px` }}></div>
                          ))}
                       </div>
                       <p className="text-[8px] font-mono tracking-[0.5em] text-slate-400">000{materialToPrint.id.replace(/\D/g, '')}999</p>
                    </div>
                 </div>
                 <p className="text-[7px] text-center mt-4 text-slate-400 uppercase font-bold tracking-widest print:mt-2">Válido enquanto durarem os estoques</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
