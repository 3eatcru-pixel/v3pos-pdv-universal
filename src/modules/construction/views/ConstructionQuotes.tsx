import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileCheck,
  Send,
  DollarSign,
  X,
  ShoppingCart,
  Trash2,
  ChevronRight,
  User as UserIcon,
  Package,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../../../lib/utils';
import { paymentService } from '../../../services/paymentService';
import { Quote, constructionService, Customer, ConstructionMaterial } from '../services/constructionService';

export const ConstructionQuotes: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [quoteToPrint, setQuoteToPrint] = useState<Quote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Selection state for new quote
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [quoteItems, setQuoteItems] = useState<Array<{ material: ConstructionMaterial, quantity: number }>>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const custs = await constructionService.getCustomers();
    setCustomers(custs);
  };

  const handlePrint = (quote: Quote) => {
    setQuoteToPrint(quote);
    setIsPrintModalOpen(true);
  };

  const executePrint = () => {
    window.print();
  };

  const handleCreateQuote = async () => {
    if (!selectedCustomer || quoteItems.length === 0) return;

    const newQuote: Quote = {
      id: `q-${Math.floor(Math.random() * 1000)}`,
      clientId: selectedCustomer.id,
      clientName: selectedCustomer.name,
      items: quoteItems.map(item => ({
        productId: item.material.id,
        productName: item.material.name,
        quantity: item.quantity,
        unit: item.material.unit,
        priceAtTime: item.material.price
      })),
      status: 'draft',
      total: quoteItems.reduce((acc, item) => acc + (item.material.price * item.quantity), 0),
      createdAt: Date.now()
    };

    setQuotes([newQuote, ...quotes]);
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setQuoteItems([]);
  };

  const addItemToQuote = (material: ConstructionMaterial) => {
    const existing = quoteItems.find(i => i.material.id === material.id);
    if (existing) {
      setQuoteItems(quoteItems.map(i => i.material.id === material.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setQuoteItems([...quoteItems, { material, quantity: 1 }]);
    }
  };

  const removeItemFromQuote = (id: string) => {
    setQuoteItems(quoteItems.filter(i => i.material.id !== id));
  };
  const MOCK_MATERIALS_FOR_QUOTE: ConstructionMaterial[] = [
    { id: 'm1', name: 'AREIA LAVADA', category: 'masonry', price: 120, stock: 10, unit: 'm3', minStock: 2, section: 'A1', cost: 80, createdAt: Date.now() },
    { id: 'm2', name: 'CIMENTO CP II', category: 'structural', price: 38.9, stock: 100, unit: 'saco', minStock: 10, section: 'B2', cost: 28, createdAt: Date.now() },
    { id: 'm3', name: 'TIJOLO BAIANO', category: 'masonry', price: 0.85, stock: 5000, unit: 'un', minStock: 500, section: 'C1', cost: 0.6, createdAt: Date.now() },
    { id: 'm4', name: 'FIO 2.5MM AZUL', category: 'electric', price: 2.45, stock: 500, unit: 'metro', minStock: 50, section: 'D1', cost: 1.8, createdAt: Date.now() },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Orçamentos & Vendas</h2>
          <p className="text-slate-500 font-medium">Gestão de propostas comerciais e conversão em faturamento</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
        >
          <Plus className="w-5 h-5" /> Nova Cotação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total do Mês', value: formatCurrency(quotes.reduce((acc, q) => acc + q.total, 0)), icon: <DollarSign className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Conversão', value: '75%', icon: <FileCheck className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Aguardando', value: quotes.filter(q => q.status === 'draft').length.toString().padStart(2, '0'), icon: <Clock className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
          { label: 'Enviados', value: '24', icon: <Send className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.color}`}>{stat.icon}</div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
             </div>
             <p className="text-2xl font-black text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="relative flex-1">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="text" 
                placeholder="Buscar por cliente, ID ou material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] py-4 pl-14 pr-6 font-bold outline-none transition-all"
              />
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                 <tr className="border-b border-slate-50">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente / Obra</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                 </tr>
              </thead>
              <tbody>
                 {quotes.filter(q => q.clientName.toLowerCase().includes(searchTerm.toLowerCase())).map(quote => (
                   <tr key={quote.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                         <span className="font-black text-slate-800 text-xs text-blue-600">#{quote.id}</span>
                      </td>
                      <td className="px-8 py-6">
                         <p className="font-black text-slate-800 uppercase text-xs tracking-tight">{quote.clientName}</p>
                         <p className="text-[10px] font-bold text-slate-400">{quote.items.length} itens no pedido</p>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-xs font-bold text-slate-600">{new Date(quote.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-8 py-6">
                         <span className="text-sm font-black text-slate-800">{formatCurrency(quote.total)}</span>
                      </td>
                      <td className="px-8 py-6">
                         <span className={cn(
                           "text-[9px] font-black uppercase px-2 py-1 rounded-md",
                           quote.status === 'sent' ? "bg-blue-50 text-blue-600" :
                           quote.status === 'approved' ? "bg-emerald-50 text-emerald-600" : 
                           quote.status === 'draft' ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
                         )}>
                            {quote.status}
                         </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handlePrint(quote)}
                              className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-all"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => alert(`Enviando cotação para ${quote.clientName}...`)}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            {quote.status !== 'approved' && (
                               <button 
                                 onClick={() => {
                                   setQuotes(quotes.map(q => q.id === quote.id ? { ...q, status: 'approved' } : q));
                                 }}
                                 className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                               >
                                 <FileCheck className="w-4 h-4" />
                               </button>
                            )}
                            {quote.status === 'approved' && (
                               <button 
                                 onClick={async () => {
                                   try {
                                     await paymentService.processPayment({ amount: quote.total, method: 'other', module: 'construction', orderId: quote.id });
                                     setQuotes(quotes.map(q => q.id === quote.id ? { ...q, status: 'paid' } : q));
                                     alert(`Pagamento de ${formatCurrency(quote.total)} recebido com sucesso!`);
                                   } catch (err) {
                                     alert('Erro ao processar pagamento');
                                   }
                                 }}
                                 className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest"
                               >
                                 <DollarSign className="w-3 h-3" /> Pagar
                               </button>
                            )}
                            <button className="p-2 bg-slate-100 text-slate-600 rounded-lg"><MoreVertical className="w-4 h-4" /></button>
                         </div>
                      </td>
                   </tr>
                 ))}
                 {quotes.length === 0 && (
                   <tr>
                     <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                        Nenhum orçamento registrado recentemente.
                     </td>
                   </tr>
                 )}
              </tbody>
           </table>
        </div>
      </div>

      {/* New Quote Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-5xl h-[85vh] bg-white rounded-[3rem] shadow-3xl flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Novo Pedido / Orçamento</h3>
                    <p className="text-slate-500 font-medium text-sm">Selecione o cliente e adicione os materiais.</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white text-slate-400 rounded-2xl hover:text-rose-500 transition-colors shadow-sm">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex">
                {/* Product Selection */}
                <div className="flex-1 p-8 overflow-y-auto custom-scrollbar border-r border-slate-100">
                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Filtrar materiais..."
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl py-3 pl-12 pr-6 font-bold outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {MOCK_MATERIALS_FOR_QUOTE.map(mat => (
                      <button 
                        key={mat.id}
                        onClick={() => addItemToQuote(mat)}
                        className="p-4 rounded-[1.5rem] bg-white border border-slate-100 hover:border-blue-500 hover:shadow-lg transition-all text-left flex items-start gap-4 group"
                      >
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                           <Package className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <div className="flex-1 truncate">
                           <h5 className="font-black text-slate-800 text-xs uppercase truncate leading-none mb-1">{mat.name}</h5>
                           <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md inline-block mb-2">{mat.category}</span>
                           <p className="text-sm font-black text-slate-800">{formatCurrency(mat.price)} <span className="text-[10px] text-slate-400">/{mat.unit}</span></p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cart & Selection */}
                <div className="w-96 bg-slate-50/50 p-8 flex flex-col gap-6">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4 px-2">Cliente Destino</label>
                      <select 
                        className="w-full bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl py-4 px-6 font-bold outline-none transition-all appearance-none shadow-sm"
                        onChange={(e) => setSelectedCustomer(customers.find(c => c.id === e.target.value) || null)}
                        value={selectedCustomer?.id || ''}
                      >
                        <option value="">Selecione um cliente...</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                   </div>

                   <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-inner flex flex-col overflow-hidden">
                      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                         <span className="text-[10px] font-black uppercase tracking-widest">Carrinho</span>
                         <span className="text-[10px] font-black">{quoteItems.length} Itens</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                         {quoteItems.map(item => (
                           <div key={item.material.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl relative group">
                              <div className="flex-1 truncate">
                                 <h6 className="text-[10px] font-black text-slate-800 uppercase truncate mb-0.5">{item.material.name}</h6>
                                 <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-slate-500">{item.quantity} {item.material.unit} x</span>
                                    <span className="text-[10px] font-black text-slate-800">{formatCurrency(item.material.price)}</span>
                                 </div>
                              </div>
                              <div className="text-right shrink-0">
                                 <p className="text-xs font-black text-blue-600">{formatCurrency(item.material.price * item.quantity)}</p>
                              </div>
                              <button 
                                onClick={() => removeItemFromQuote(item.material.id)}
                                className="absolute -right-2 -top-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 hover:scale-100 shadow-lg"
                              >
                                <X className="w-3 h-3" />
                              </button>
                           </div>
                         ))}
                         {quoteItems.length === 0 && (
                           <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-30">
                              <ShoppingCart className="w-12 h-12 mb-2" />
                              <p className="text-xs font-bold uppercase tracking-widest">Carrinho Vazio</p>
                           </div>
                         )}
                      </div>
                      <div className="p-6 bg-slate-50 border-t border-slate-100">
                         <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-black uppercase text-slate-400">Total Geral</span>
                            <span className="text-xl font-black text-slate-800">{formatCurrency(quoteItems.reduce((acc, i) => acc + (i.material.price * i.quantity), 0))}</span>
                         </div>
                         <button 
                           onClick={handleCreateQuote}
                           disabled={!selectedCustomer || quoteItems.length === 0}
                           className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 disabled:grayscale"
                         >
                            Finalizar Proposta
                         </button>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Preview Modal */}
      <AnimatePresence>
        {isPrintModalOpen && quoteToPrint && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white print:backdrop-blur-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-white rounded-[3rem] shadow-3xl flex flex-col h-[90vh] overflow-hidden print:h-auto print:rounded-none print:shadow-none"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 print:hidden">
                 <div className="flex items-center gap-3">
                    <Printer className="w-5 h-5 text-blue-600" />
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Visualização de Impressão</h3>
                 </div>
                 <div className="flex items-center gap-2">
                    <p className="hidden md:block text-[9px] font-bold text-slate-400 uppercase mr-4">
                      Dica: Selecione "Salvar como PDF" no destino para baixar o arquivo
                    </p>
                    <button 
                      onClick={executePrint}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                    >
                      Imprimir / Salvar PDF
                    </button>
                    <button 
                      onClick={() => setIsPrintModalOpen(false)}
                      className="p-3 bg-white text-slate-400 rounded-xl hover:text-rose-500 transition-colors shadow-sm"
                    >
                      <X className="w-6 h-6" />
                    </button>
                 </div>
              </div>

              <div id="printable-area" className="flex-1 overflow-y-auto p-12 print:overflow-visible print:p-0">
                 <div className="max-w-3xl mx-auto space-y-12">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8">
                       <div>
                          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-2">LOJA DE MATERIAIS</h1>
                          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Soluções Completas para sua Obra</p>
                          <div className="mt-4 text-xs font-bold text-slate-600 space-y-1">
                             <p>Av. das Indústrias, 1000 - Setor Industrial</p>
                             <p>CEP: 12345-678 | Cidade Exemplo - EX</p>
                             <p>Telefone: (11) 98765-4321</p>
                             <p>CNPJ: 12.345.678/0001-99</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="bg-slate-900 text-white px-6 py-3 rounded-xl inline-block mb-4">
                             <p className="text-[10px] font-black uppercase tracking-widest mb-1">Cotação / Pedido</p>
                             <p className="text-2xl font-black">#{quoteToPrint.id}</p>
                          </div>
                          <p className="text-xs font-bold text-slate-500 uppercase">Emitido em</p>
                          <p className="text-sm font-black text-slate-800">{new Date(quoteToPrint.createdAt).toLocaleString('pt-BR')}</p>
                       </div>
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-8 bg-slate-50 p-8 rounded-3xl border border-slate-100 print:bg-white print:border-slate-200">
                       <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Informações do Cliente</p>
                          <div>
                             <p className="text-lg font-black text-slate-900 uppercase">{quoteToPrint.clientName}</p>
                             <p className="text-xs font-bold text-slate-600 mt-1">ID do Cliente: {quoteToPrint.clientId}</p>
                          </div>
                       </div>
                       <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Status do Documento</p>
                          <div className="flex items-center gap-2">
                             <span className={cn(
                               "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                               quoteToPrint.status === 'billed' ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
                             )}>
                                {quoteToPrint.status === 'billed' ? 'RECIBO DE VENDA' : 'ORÇAMENTO VIGENTE'}
                             </span>
                          </div>
                       </div>
                    </div>

                    {/* Items Table */}
                    <div className="space-y-4">
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Discriminação dos Materiais</p>
                       <table className="w-full">
                          <thead>
                             <tr className="border-b-2 border-slate-900">
                                <th className="py-4 text-left text-xs font-black uppercase tracking-widest">Cód</th>
                                <th className="py-4 text-left text-xs font-black uppercase tracking-widest">Descrição</th>
                                <th className="py-4 text-center text-xs font-black uppercase tracking-widest">Qtd</th>
                                <th className="py-4 text-right text-xs font-black uppercase tracking-widest">V. Unit</th>
                                <th className="py-4 text-right text-xs font-black uppercase tracking-widest">Total</th>
                             </tr>
                          </thead>
                          <tbody>
                             {quoteToPrint.items.map((item, idx) => (
                               <tr key={idx} className="border-b border-slate-100">
                                  <td className="py-4 text-xs font-bold text-slate-500">#{item.productId.slice(-4)}</td>
                                  <td className="py-4 text-xs font-black text-slate-800 uppercase">{item.productName}</td>
                                  <td className="py-4 text-center text-xs font-bold text-slate-800">{item.quantity} {item.unit}</td>
                                  <td className="py-4 text-right text-xs font-bold text-slate-600">{formatCurrency(item.priceAtTime)}</td>
                                  <td className="py-4 text-right text-xs font-black text-slate-900">{formatCurrency(item.priceAtTime * item.quantity)}</td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end pt-8 border-t-2 border-slate-900">
                       <div className="w-64 space-y-3">
                          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                             <span>Subtotal</span>
                             <span>{formatCurrency(quoteToPrint.total)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase">
                             <span>Descontos</span>
                             <span>R$ 0,00</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
                             <span className="text-[10px] font-black uppercase tracking-widest">Total Geral</span>
                             <span className="text-xl font-black">{formatCurrency(quoteToPrint.total)}</span>
                          </div>
                       </div>
                    </div>

                    {/* Footer / Signature */}
                    <div className="pt-20 grid grid-cols-2 gap-12">
                       <div className="space-y-4">
                          <div className="h-[1px] bg-slate-400 w-full mb-2"></div>
                          <p className="text-[10px] font-bold text-center text-slate-500 uppercase font-sans">Assinatura do Responsável</p>
                       </div>
                       <div className="space-y-4">
                          <div className="h-[1px] bg-slate-400 w-full mb-2"></div>
                          <p className="text-[10px] font-bold text-center text-slate-500 uppercase font-sans">Recebido por (Nome Legível / RG)</p>
                       </div>
                    </div>

                    <div className="text-center pt-8 opacity-30">
                       <p className="text-[8px] font-bold uppercase tracking-[0.2em]">Documento gerado eletronicamente via Sistema Loja V1</p>
                    </div>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
