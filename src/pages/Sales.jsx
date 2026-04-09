import { useState, useEffect } from 'react';
import { FaSearch, FaTimes, FaPrint, FaTrash, FaUndo, FaExchangeAlt, FaFileInvoiceDollar, FaCheckSquare, FaSquare } from 'react-icons/fa';
import { printReceipt, printVoucher } from '../utils/printer';
import { formatCurrency, formatDate, generateId } from '../utils/calculations';
import { getCurrentStore } from '../utils/storage';
import { getSales, updateSaleStatus, increaseStock, createVoucher } from '../services/dbService';
import { consultNfce, emitNfe55 } from '../services/nfeService';
import PinModal from '../components/PinModal';

const Sales = () => {
    const [sales, setSales] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [selectedSale, setSelectedSale] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [currentStore, setCurrentStore] = useState(null);

    // Exchange Logic
    const [isExchangeMode, setIsExchangeMode] = useState(false);
    const [selectedExchangeItems, setSelectedExchangeItems] = useState({}); // { itemId: quantity }

    // Security
    const [showPinModal, setShowPinModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // 'CANCEL', 'EXCHANGE'
    const [generatedVoucher, setGeneratedVoucher] = useState(null); // New State for Success Modal

    // NFe State
    const [isConsultingNfce, setIsConsultingNfce] = useState(false);
    const [isEmittingNfe, setIsEmittingNfe] = useState(false);

    // Load initial data
    useEffect(() => {
        const store = getCurrentStore();
        if (store) {
            setCurrentStore(store);
            loadSales(store.id);
        }
    }, []);

    const loadSales = async (storeId) => {
        const allSales = await getSales(storeId);
        const sorted = allSales.sort((a, b) => new Date(b.date) - new Date(a.date));
        setSales(sorted);
        setFilteredSales(sorted);
    };

    // ... Filter logic ...
    useEffect(() => {
        let filtered = sales;

        if (searchTerm) {
            filtered = filtered.filter(s =>
                s.id.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (dateFilter) {
            filtered = filtered.filter(s =>
                s.date.substring(0, 10) === dateFilter
            );
        }

        setFilteredSales(filtered);
    }, [searchTerm, dateFilter, sales]);

    const initiateAction = (action) => {
        setPendingAction(action);
        setShowPinModal(true);
    };

    const handleAuthSuccess = () => {
        setShowPinModal(false);
        if (pendingAction === 'CANCEL') {
            if (confirm(`ADMIN: Deseja realmente cancelar a venda #${selectedSale.id.substr(0, 8)}?`)) {
                performCancelSale(selectedSale);
            }
        } else if (pendingAction === 'EXCHANGE') {
            setIsExchangeMode(true);
        }
        setPendingAction(null);
    };

    const performCancelSale = async (sale) => {
        // 1. Mark sale as cancelled in DB
        await updateSaleStatus(sale.id, 'CANCELLED');

        // 2. Return items to stock
        await increaseStock(sale.items);

        // 3. Update UI
        loadSales(currentStore.id);
        setSelectedSale(null);
        alert('Venda cancelada com sucesso! Estoque atualizado.');
    };

    const toggleItemSelection = (item, maxQty) => {
        const currentQty = selectedExchangeItems[item.id] || 0;
        const newQty = currentQty >= maxQty ? 0 : maxQty; // Simple toggle for full amount for now, can implement partial qty later

        setSelectedExchangeItems(prev => ({
            ...prev,
            [item.id]: newQty
        }));
    };

    const calculateExchangeTotal = () => {
        if (!selectedSale) return 0;
        return selectedSale.items.reduce((acc, item) => {
            const qty = selectedExchangeItems[item.id] || 0;
            return acc + (item.price * qty);
        }, 0);
    };

    const handleGenerateVoucher = async () => {
        const total = calculateExchangeTotal();
        if (total <= 0) {
            alert("Selecione pelo menos um item para trocar.");
            return;
        }

        const code = 'VALE-' + generateId().substr(0, 6).toUpperCase();

        // Create Voucher Object
        const newVoucher = {
            code,
            value: total,
            remainingValue: total,
            status: 'ACTIVE',
            storeId: currentStore.id,
            originSaleId: selectedSale.id,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        // 0. Create Voucher in DB
        createVoucher(newVoucher);

        // 1. Return items to stock (Only selected ones)
        const itemsToReturn = selectedSale.items
            .filter(item => selectedExchangeItems[item.id] > 0)
            .map(item => ({
                ...item,
                quantity: selectedExchangeItems[item.id]
            }));

        await increaseStock(itemsToReturn);

        // Reset UI
        setIsExchangeMode(false);
        setSelectedExchangeItems({});
        setSelectedSale(null);

        // Show Success Modal
        setGeneratedVoucher(newVoucher);

        // Refresh sales/stock
        loadSales(currentStore.id);
    };

    const handlePrintReceipt = (sale) => {
        const settings = JSON.parse(localStorage.getItem('caramelo_printer_settings') || '{}');
        printReceipt(sale, currentStore, settings);
    };

    const handleConsultNfce = async () => {
        if (!selectedSale || !currentStore) return;

        setIsConsultingNfce(true);
        try {
            const res = await consultNfce(currentStore.id, selectedSale.id);
            if (res.success && res.pdf) {
                window.open(`https://api.focusnfe.com.br${res.pdf}`, '_blank');
            } else if (res.success && res.status === "processando_autorizacao") {
                alert("A nota ainda está em processamento na Sefaz. Tente novamente em alguns segundos.");
            } else {
                alert(`Não foi possível recuperar a NFC-e (ou ela não foi emitida para esta venda).\nSefaz: ${res.mensagem_sefaz || res.error || 'N/A'}`);
            }
        } catch (error) {
            console.error("Consult NFC-e Error:", error);
            alert("Erro ao consultar NFC-e.");
        } finally {
            setIsConsultingNfce(false);
        }
    };

    const handleEmitNfe55 = async () => {
        if (!selectedSale || !currentStore) return;

        if (!selectedSale.customer || !selectedSale.customer.cep) {
            alert("Para emitir NF-e (Modelo 55), é necessário selecionar um cliente com endereço completo cadastrado.");
            return;
        }

        if (!confirm("Deseja emitir a NF-e (Modelo 55) para esta venda?")) return;

        setIsEmittingNfe(true);
        try {
            const res = await emitNfe55(currentStore.id, selectedSale);
            if (res.success) {
                alert("NF-e enviada com sucesso! Aguarde alguns segundos e clique em 'Consultar' para baixar o DANFE.");
            } else {
                alert(`Erro na emissão: ${res.error}\n${res.details?.map(d => d.mensagem).join('\n') || ''}`);
            }
        } catch (error) {
            console.error("Emit NFe 55 Error:", error);
            alert("Erro ao emitir NF-e.");
        } finally {
            setIsEmittingNfe(false);
        }
    };

    return (
        <div className="container-center p-4 md:p-8" style={{ height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column' }}>
            <div className={`flex-between mb-4 ${selectedSale ? 'hidden lg:flex' : 'flex'}`}>
                <h1 style={{ fontSize: '1.8rem', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                    <FaSearch className="mr-2" style={{ color: 'var(--primary)' }} /> Localizador de Vendas
                </h1>
                <div style={{ color: 'var(--text-scnd)' }}>
                    {filteredSales.length} registros encontrados
                </div>
            </div>

            {/* Filter Bar */}
            <div className={`card mb-4 p-4 grid grid-cols-1 md:flex gap-4 items-end ${selectedSale ? 'hidden lg:flex' : 'grid'}`} style={{ background: '#111', borderRadius: '12px', border: '1px solid #333' }}>
                <div style={{ flex: 1 }}>
                    <label className="input-label-premium">Nº Venda / ID</label>
                    <input
                        className="input-premium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por código..."
                    />
                </div>
                <div>
                    <label className="input-label-premium">Data</label>
                    <input
                        type="date"
                        className="input-premium"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                </div>
                <button className="btn btn-primary h-[42px]" onClick={() => { setSearchTerm(''); setDateFilter(''); }}>
                    Limpar
                </button>
            </div>

            {/* Main Grid */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-6">

                {/* List */}
                <div className={`premium-table-container mt-0 ${selectedSale ? 'hidden lg:block' : 'block'}`} style={{ background: '#0a0a0a' }}>
                    <table className="premium-table">
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th className="hidden sm:table-cell">ID Venda</th>
                                <th className="hidden md:table-cell">Pagamento</th>
                                <th>Total</th>
                                <th className="hidden sm:table-cell">Desconto</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.map(sale => (
                                <tr
                                    key={sale.id}
                                    onClick={() => { setSelectedSale(sale); setIsExchangeMode(false); setSelectedExchangeItems({}); }}
                                    style={{
                                        cursor: 'pointer',
                                        background: selectedSale?.id === sale.id ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                                        borderLeft: selectedSale?.id === sale.id ? '4px solid var(--primary)' : '4px solid transparent'
                                    }}
                                >
                                    <td>{formatDate(sale.date)}</td>
                                    <td className="hidden sm:table-cell" style={{ fontFamily: 'monospace', color: '#888' }}>{sale.id.substr(0, 8).toUpperCase()}</td>
                                    <td className="hidden md:table-cell" style={{ fontSize: '0.8rem', color: '#aaa' }}>
                                        {sale.payment?.payments?.length > 1 ? (
                                            <span className="bg-gray-800 px-2 py-0.5 rounded text-[10px] font-bold">MÚLTIPLO</span>
                                        ) : (
                                            sale.payment?.payments?.[0]?.method === 'MONEY' ? 'Dinheiro' :
                                                sale.payment?.payments?.[0]?.method === 'PIX' ? 'PIX' :
                                                    sale.payment?.payments?.[0]?.method === 'CREDIT_CARD' ? 'C. Crédito' :
                                                        sale.payment?.payments?.[0]?.method === 'DEBIT_CARD' ? 'C. Débito' :
                                                            sale.payment?.payments?.[0]?.method === 'CREDIARIO' ? 'Crediário' :
                                                                sale.payment?.payments?.[0]?.method === 'VOUCHER' ? 'Vale' : 'N/A'
                                        )}
                                    </td>
                                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(sale.total)}</td>
                                    <td className="hidden sm:table-cell">
                                        {sale.payment?.discount > 0 ? (
                                            <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>-{formatCurrency(sale.payment.discount)}</span>
                                        ) : (
                                            <span style={{ color: '#444', fontSize: '0.8rem' }}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        {sale.status === 'CANCELLED' ? (
                                            <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem' }}>CANCELADA</span>
                                        ) : (
                                            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.8rem' }}>CONCLUÍDA</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Details Panel */}
                <div className={`${selectedSale ? 'flex' : 'hidden lg:flex'} flex-1 flex-col bg-[#111] rounded-xl border border-[#333] overflow-hidden`}>
                    {selectedSale ? (
                        <>
                            <div className="p-4 border-b border-gray-800 bg-[#151515] flex-between">
                                <h3 className="m-0 text-white flex items-center gap-2">
                                    <FaFileInvoiceDollar className="text-primary" />
                                    {isExchangeMode ? 'Selecionar Itens para Troca' : 'Detalhes da Venda'}
                                </h3>
                                <button className="text-gray-400 hover:text-white" onClick={() => setSelectedSale(null)}>
                                    <FaTimes />
                                </button>
                            </div>

                            <div className="p-4 md:p-6 flex-1 overflow-auto bg-[#0a0a0a] custom-scrollbar">
                                {!isExchangeMode && (
                                    <div className="mb-6 relative">
                                        {/* Status Badge */}
                                        <div className={`absolute -top-1 -right-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${selectedSale.status === 'CANCELLED' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                                            {selectedSale.status === 'CANCELLED' ? 'Cancelada' : 'Confirmada'}
                                        </div>

                                        <div className="text-center p-6 bg-[#111] rounded-3xl border border-gray-800 shadow-inner">
                                            <p className="text-gray-500 text-[10px] uppercase font-black tracking-[0.2em] mb-2">Total Recebido</p>
                                            <h2 className="text-4xl md:text-5xl font-black text-primary font-mono mb-2">{formatCurrency(selectedSale.total)}</h2>
                                            {selectedSale.payment?.discount > 0 && (
                                                <div className="text-red-500 font-bold text-xs bg-red-500/10 inline-block px-3 py-1 rounded-full border border-red-500/20">
                                                    DESC: -{formatCurrency(selectedSale.payment.discount)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Secondary Info Grid */}
                                        <div className="grid grid-cols-2 gap-2 mt-4">
                                            <div className="p-3 bg-gray-900/50 rounded-2xl border border-gray-800">
                                                <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Vendedor</p>
                                                <p className="text-xs font-bold text-gray-200 truncate">{selectedSale.sellerName || 'Loja'}</p>
                                            </div>
                                            <div className="p-3 bg-gray-900/50 rounded-2xl border border-gray-800">
                                                <p className="text-[9px] text-gray-500 uppercase font-black mb-1">Cliente</p>
                                                <p className="text-xs font-bold text-gray-200 truncate">{selectedSale.customer?.name || 'Consumidor'}</p>
                                            </div>
                                        </div>

                                        {/* Observation / Notes Section */}
                                        {selectedSale.observation && (
                                            <div className="mt-4 p-4 bg-orange-900/10 rounded-2xl border border-orange-900/20">
                                                <p className="text-[9px] text-orange-500 uppercase font-black mb-1 tracking-widest">Observações:</p>
                                                <p className="text-sm italic font-medium text-gray-300 leading-relaxed border-l-2 border-orange-500/30 pl-3">"{selectedSale.observation}"</p>
                                            </div>
                                        )}

                                        {/* Payment Details */}
                                        <div className="mt-4 p-4 bg-[#111] rounded-2xl border border-gray-800">
                                            <p className="text-[9px] text-gray-500 uppercase font-black mb-3 text-center border-b border-gray-800 pb-2">Formas de Captura</p>
                                            <div className="space-y-3">
                                                {selectedSale.payment?.payments?.map((p, i) => (
                                                    <div key={i} className="flex justify-between items-center text-xs font-mono">
                                                        <span className="text-gray-500 font-sans font-bold">
                                                            {p.method === 'MONEY' ? 'Dinheiro' :
                                                                p.method === 'PIX' ? 'PIX' :
                                                                    p.method === 'CREDIT_CARD' ? 'C. Crédito' :
                                                                        p.method === 'DEBIT_CARD' ? 'C. Débito' :
                                                                            p.method === 'CREDIARIO' ? 'Crediário' :
                                                                                p.method === 'VOUCHER' ? 'Vale Troca' : p.method}
                                                        </span>
                                                        <span className="text-white font-black text-sm">{formatCurrency(p.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="mb-6">
                                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-3 block text-center">Itens da Venda</label>
                                    <div className="space-y-2">
                                        {selectedSale.items.map((item, idx) => {
                                            const currentQty = selectedExchangeItems[item.id] || 0;
                                            const isSelected = currentQty > 0;

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between
                                                        ${isExchangeMode ? 'cursor-pointer hover:border-primary active:scale-95' : 'bg-[#111] border-gray-800'}
                                                        ${isSelected ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10' : 'bg-[#0f0f0f] border-gray-800/50'}
                                                    `}
                                                    onClick={() => {
                                                        if (isExchangeMode) {
                                                            toggleItemSelection(item, item.quantity);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {isExchangeMode && (
                                                            <div className={isSelected ? 'text-primary' : 'text-gray-700'}>
                                                                {isSelected ? <FaCheckSquare size={20} /> : <FaSquare size={20} />}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className={`font-black text-xs md:text-sm transition-colors ${isSelected ? 'text-primary' : 'text-gray-100'}`}>{item.name}</div>
                                                            <div className="text-[10px] font-bold text-gray-500 mt-0.5">
                                                                {item.quantity} {item.unit || 'UN'} x {formatCurrency(item.price)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="text-right">
                                                        <div className="text-sm font-black text-gray-200">
                                                            {formatCurrency(item.price * (isExchangeMode ? (currentQty || item.quantity) : item.quantity))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {isExchangeMode && (
                                        <div className="mt-6 p-5 bg-primary rounded-3xl text-center shadow-2xl shadow-primary/20">
                                            <p className="text-black text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total da Troca</p>
                                            <p className="text-3xl font-black text-black">{formatCurrency(calculateExchangeTotal())}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 border-t border-gray-800 bg-[#151515] flex flex-col gap-3">
                                {isExchangeMode ? (
                                    <>
                                        <button
                                            className="btn btn-primary w-full py-3 font-bold"
                                            onClick={handleGenerateVoucher}
                                        >
                                            <FaCheckSquare className="mr-2" /> CONFIRMAR E GERAR VALE
                                        </button>
                                        <button
                                            className="btn btn-secondary w-full py-3 mt-2"
                                            onClick={() => setIsExchangeMode(false)}
                                        >
                                            Cancelar Seleção
                                        </button>
                                    </>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-900/20 text-blue-400 border border-blue-500/30 rounded-2xl hover:bg-blue-900/40 active:scale-95 transition-all text-[10px] font-black uppercase"
                                            onClick={() => handlePrintReceipt(selectedSale)}
                                        >
                                            <FaPrint size={16} /> Cupom
                                        </button>
                                        <button
                                            className="flex flex-col items-center justify-center gap-1 p-3 bg-indigo-900/20 text-indigo-400 border border-indigo-500/30 rounded-2xl hover:bg-indigo-900/40 active:scale-95 transition-all text-[10px] font-black uppercase"
                                            onClick={handleConsultNfce}
                                            disabled={isConsultingNfce}
                                        >
                                            <FaFileInvoiceDollar size={16} /> {isConsultingNfce ? '...' : 'Consultar'}
                                        </button>
                                        <button
                                            className="flex flex-col items-center justify-center gap-1 p-3 bg-green-900/20 text-green-400 border border-green-500/30 rounded-2xl hover:bg-green-900/40 active:scale-95 transition-all text-[10px] font-black uppercase disabled:opacity-30"
                                            onClick={handleEmitNfe55}
                                            disabled={isEmittingNfe || selectedSale.status === 'CANCELLED'}
                                        >
                                            <FaFileInvoiceDollar size={16} /> {isEmittingNfe ? 'Emitindo...' : 'NF-e 55'}
                                        </button>
                                        <button
                                            className="flex flex-col items-center justify-center gap-1 p-3 bg-purple-900/20 text-purple-400 border border-purple-500/30 rounded-2xl hover:bg-purple-900/40 active:scale-95 transition-all text-[10px] font-black uppercase disabled:opacity-30"
                                            onClick={() => initiateAction('EXCHANGE')}
                                            disabled={selectedSale.status === 'CANCELLED'}
                                        >
                                            <FaExchangeAlt size={16} /> Trocar
                                        </button>
                                        <button
                                            className="col-span-2 flex items-center justify-center gap-2 p-3 bg-red-900/10 text-red-500 border border-red-500/20 rounded-2xl hover:bg-red-900/20 active:scale-95 transition-all text-xs font-black uppercase disabled:opacity-30"
                                            disabled={selectedSale.status === 'CANCELLED'}
                                            onClick={() => initiateAction('CANCEL')}
                                        >
                                            <FaUndo /> Cancelar Venda
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-center flex-col h-full text-muted p-8 text-center" style={{ opacity: 0.5 }}>
                            <FaSearch size={64} className="mb-4 text-gray-700" />
                            <p>Selecione uma venda para visualizar</p>
                        </div>
                    )}
                </div>
            </div>

            <PinModal
                isOpen={showPinModal}
                onClose={() => setShowPinModal(false)}
                onSuccess={handleAuthSuccess}
                title={pendingAction === 'CANCEL' ? 'Autorizar Cancelamento' : 'Autorizar Troca'}
                requiredRole="MANAGER"
                requiredPermission={pendingAction === 'EXCHANGE' ? 'issue_voucher' : null}
            />

            {/* VOUCHER SUCCESS MODAL */}
            {
                generatedVoucher && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
                    }}>
                        <div className="bg-[#111] border border-gray-700 p-8 rounded-2xl w-[400px] text-center shadow-2xl relative">
                            <button
                                onClick={() => setGeneratedVoucher(null)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white"
                            >
                                <FaTimes size={20} />
                            </button>

                            <div className="mx-auto w-16 h-16 bg-green-900/20 text-green-500 rounded-full flex items-center justify-center mb-6 border border-green-900/50">
                                <FaCheckSquare size={32} />
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-2">Vale Gerado!</h2>
                            <p className="text-gray-400 mb-6">O vale troca foi criado com sucesso.</p>

                            <div className="bg-[#0a0a0a] p-4 rounded-lg border border-gray-800 mb-6">
                                <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">CÓDIGO DO VALE</div>
                                <div className="text-3xl font-mono font-bold text-primary mb-2 tracking-widest">{generatedVoucher.code}</div>
                                <div className="text-xl text-white">{formatCurrency(generatedVoucher.value)}</div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    className="btn btn-primary w-full py-4 text-lg font-bold flex items-center justify-center gap-2"
                                    onClick={() => {
                                        const settings = JSON.parse(localStorage.getItem('caramelo_printer_settings') || '{}');
                                        printVoucher(generatedVoucher, currentStore, settings);
                                    }}
                                >
                                    <FaPrint /> IMPRIMIR COMPROVANTE
                                </button>
                                <button
                                    className="btn btn-secondary w-full py-3"
                                    onClick={() => setGeneratedVoucher(null)}
                                >
                                    Fechar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Sales;
