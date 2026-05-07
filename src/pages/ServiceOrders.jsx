import { useState, useEffect } from 'react';
import { FaPlus, FaTrash, FaUser, FaCheck, FaFileInvoiceDollar, FaTimes, FaSearch, FaHistory, FaLock, FaSync } from 'react-icons/fa';
import { getServices, getServiceOrders, addServiceOrder, updateServiceOrder, getCustomers, addSale } from '../services/dbService';
import { emitNfse, consultNfse } from '../services/nfseService';
import { getCurrentStore, getCurrentUser } from '../utils/storage';
import { formatCurrency, generateId } from '../utils/calculations';
import PinModal from '../components/PinModal';
import CustomerSelectionModal from '../components/CustomerSelectionModal';
import { useNavigate } from 'react-router-dom';

const ServiceOrders = () => {
    const [services, setServices] = useState([]);
    const [orders, setOrders] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [currentStore, setCurrentStore] = useState(null);
    const [activeTab, setActiveTab] = useState('NOVA_ORDEM'); // 'NOVA_ORDEM' | 'HISTORICO'

    // Order State
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [orderItems, setOrderItems] = useState([]);
    const [paymentMethod, setPaymentMethod] = useState('MONEY');
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Security
    const [authorizedUser, setAuthorizedUser] = useState(null);
    const [showPinModal, setShowPinModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setShowPinModal(true);
    }, []);

    useEffect(() => {
        const store = getCurrentStore();
        if (store) {
            setCurrentStore(store);
            loadData(store.id);
        }
    }, []);

    const loadData = async (storeId) => {
        if (!storeId) return;
        const [storeServices, storeOrders, storeCustomers] = await Promise.all([
            getServices(storeId),
            getServiceOrders(storeId),
            getCustomers(storeId)
        ]);
        setServices(storeServices);
        setOrders(storeOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setCustomers(storeCustomers);
    };

    const handleAddService = (service) => {
        const existing = orderItems.find(item => item.id === service.id);
        if (existing) {
            setOrderItems(orderItems.map(item => 
                item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item
            ));
        } else {
            setOrderItems([...orderItems, { ...service, quantity: 1 }]);
        }
    };

    const handleRemoveService = (serviceId) => {
        setOrderItems(orderItems.filter(item => item.id !== serviceId));
    };

    const handleQuantityChange = (serviceId, delta) => {
        setOrderItems(orderItems.map(item => {
            if (item.id === serviceId) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    };

    const orderTotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleSubmitOrder = async (autoEmitNfse = false) => {
        if (!selectedCustomer) { alert('Selecione um cliente (Tomador) para a ordem de serviço.'); return; }
        if (orderItems.length === 0) { alert('Adicione pelo menos um serviço.'); return; }

        setIsSubmitting(true);
        try {
            const orderId = generateId();
            const orderData = {
                id: orderId,
                customer: selectedCustomer,
                items: orderItems,
                total: orderTotal,
                paymentMethod,
                status: 'CONCLUIDA',
                nfseStatus: 'PENDENTE',
                createdAt: new Date().toISOString()
            };

            const result = await addServiceOrder(currentStore.id, orderData);

            if (result.success) {
                const saleRecord = {
                    id: orderId,
                    date: orderData.createdAt,
                    items: orderItems.map(item => ({ ...item, isService: true })),
                    total: orderTotal,
                    customerName: selectedCustomer.name,
                    customer: selectedCustomer,
                    payment: { payments: [{ method: paymentMethod, amount: orderTotal }] },
                    paymentMethod,
                    status: 'COMPLETED',
                    type: 'SERVICE_ORDER',
                    nfseStatus: 'PENDENTE',
                };
                await addSale(currentStore.id, saleRecord);

                if (autoEmitNfse) {
                    await handleEmitNfse({ ...orderData, id: result.id });
                } else {
                    alert('Ordem de Serviço salva e lançada no financeiro!');
                }
                setOrderItems([]);
                setSelectedCustomer(null);
                setPaymentMethod('MONEY');
                loadData(currentStore.id);
                setActiveTab('HISTORICO');
            } else {
                alert('Erro ao salvar OS: ' + result.error);
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao processar: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEmitNfse = async (order) => {
        try {
            setIsSubmitting(true);
            const emitRes = await emitNfse(currentStore.id, order);
            
            if (emitRes.success) {
                await updateServiceOrder(order.id, { 
                    nfseStatus: 'PROCESSANDO', 
                    nfseRef: emitRes.referencia 
                });
                alert('NFS-e enviada! O status será atualizado em breve.');
                loadData(currentStore.id);
            } else {
                alert('Erro ao emitir NFS-e: ' + emitRes.error);
                await updateServiceOrder(order.id, { 
                    nfseStatus: 'ERRO', 
                    nfseError: emitRes.error 
                });
                loadData(currentStore.id);
            }
        } catch (error) {
            console.error(error);
            alert('Erro inesperado: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConsultNfse = async (order) => {
        try {
            setIsSubmitting(true);
            const consultRes = await consultNfse(currentStore.id, order.id);
            
            if (consultRes.success) {
                if (consultRes.status === 'autorizado') {
                    await updateServiceOrder(order.id, { 
                        nfseStatus: 'AUTORIZADA', 
                        nfsePdf: consultRes.pdf 
                    });
                    alert('NFS-e Autorizada com sucesso!');
                    if (consultRes.pdf) {
                        window.open(`https://api.focusnfe.com.br${consultRes.pdf}`, '_blank');
                    }
                } else if (consultRes.status === 'erro_autorizacao') {
                    await updateServiceOrder(order.id, { 
                        nfseStatus: 'ERRO', 
                        nfseError: consultRes.mensagem_sefaz || 'Erro de autorização'
                    });
                    alert('NFS-e Rejeitada: ' + consultRes.mensagem_sefaz);
                } else {
                    alert('Status da NFS-e: ' + consultRes.status);
                }
                loadData(currentStore.id);
            } else {
                alert('Erro ao consultar: ' + consultRes.error);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!authorizedUser) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white relative">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-10" />
                <PinModal
                    isOpen={showPinModal}
                    onClose={() => navigate('/dashboard')}
                    title="Acesso Restrito: Serviços"
                    requiredRole="MANAGER"
                    requiredPermission="sales"
                    onSuccess={(user) => {
                        setAuthorizedUser(user);
                        setShowPinModal(false);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h1 className="text-xl md:text-[1.8rem] font-bold flex items-center gap-2" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                    <FaFileInvoiceDollar style={{ color: 'var(--primary)' }} /> Serviços Prestados (NFS-e)
                </h1>
                
                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-800">
                    <button 
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'NOVA_ORDEM' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setActiveTab('NOVA_ORDEM')}
                    >
                        <FaPlus className="inline mr-2" /> Nova OS
                    </button>
                    <button 
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'HISTORICO' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        onClick={() => setActiveTab('HISTORICO')}
                    >
                        <FaHistory className="inline mr-2" /> Histórico de OS
                    </button>
                </div>
            </div>

            <CustomerSelectionModal 
                isOpen={showCustomerModal} 
                customers={customers}
                onClose={() => setShowCustomerModal(false)} 
                onSelect={(customer) => {
                    setSelectedCustomer(customer);
                    setShowCustomerModal(false);
                }} 
            />

            {activeTab === 'NOVA_ORDEM' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Service Selection */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <div className="bg-[#050505] border border-gray-800 rounded-2xl p-6 shadow-xl">
                            <h2 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">1. Selecionar Cliente (Tomador)</h2>
                            {selectedCustomer ? (
                                <div className="flex justify-between items-center bg-gray-900 p-4 rounded-xl border border-primary/30">
                                    <div>
                                        <div className="font-bold text-white text-lg">{selectedCustomer.name}</div>
                                        <div className="text-gray-400 text-sm">{selectedCustomer.cpfCnpj || 'CPF/CNPJ não informado'}</div>
                                    </div>
                                    <button className="btn btn-secondary text-sm" onClick={() => setSelectedCustomer(null)}>Trocar</button>
                                </div>
                            ) : (
                                <button className="w-full py-4 bg-gray-900 hover:bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 font-bold flex items-center justify-center gap-2 transition-all" onClick={() => setShowCustomerModal(true)}>
                                    <FaUser /> Buscar ou Cadastrar Cliente
                                </button>
                            )}
                        </div>

                        <div className="bg-[#050505] border border-gray-800 rounded-2xl p-6 shadow-xl flex-1">
                            <h2 className="text-lg font-bold text-white mb-4 border-b border-gray-800 pb-2">2. Catálogo de Serviços</h2>
                            {services.length === 0 ? (
                                <div className="text-center p-8 text-gray-500">
                                    Nenhum serviço cadastrado. Vá em "Catálogo de Serviços" no menu.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {services.map(service => (
                                        <div key={service.id} className="bg-gray-900 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-primary/50 cursor-pointer transition-all" onClick={() => handleAddService(service)}>
                                            <div>
                                                <div className="font-bold text-white">{service.name}</div>
                                                <div className="text-sm text-primary font-mono mt-1">{formatCurrency(service.price)}</div>
                                            </div>
                                            <button className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all">
                                                <FaPlus size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Cart/Order Summary */}
                    <div className="bg-[#050505] border border-gray-800 rounded-2xl flex flex-col shadow-xl h-[calc(100vh-180px)] sticky top-4">
                        <div className="p-4 bg-gray-900 border-b border-gray-800 rounded-t-2xl">
                            <h2 className="text-lg font-bold text-white">Resumo da Ordem</h2>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-4 flex flex-col gap-2">
                            {orderItems.length === 0 ? (
                                <div className="text-center text-gray-500 my-auto">Adicione serviços à ordem.</div>
                            ) : (
                                orderItems.map(item => (
                                    <div key={item.id} className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                                        <div className="flex justify-between font-bold text-white mb-2">
                                            <span>{item.name}</span>
                                            <span className="font-mono text-primary">{formatCurrency(item.price * item.quantity)}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3 bg-black rounded-lg p-1">
                                                <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white" onClick={() => handleQuantityChange(item.id, -1)}>-</button>
                                                <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                                                <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white" onClick={() => handleQuantityChange(item.id, 1)}>+</button>
                                            </div>
                                            <button className="text-red-500/50 hover:text-red-500" onClick={() => handleRemoveService(item.id)}>
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 bg-gray-900 border-t border-gray-800 rounded-b-2xl">
                            <div className="flex justify-between text-gray-400 mb-2 text-sm">
                                <span>Subtotal</span>
                                <span className="font-mono">{formatCurrency(orderTotal)}</span>
                            </div>
                            <div className="flex justify-between text-white font-black text-2xl mb-4">
                                <span>TOTAL</span>
                                <span className="text-primary font-mono">{formatCurrency(orderTotal)}</span>
                            </div>

                            <div className="mb-4">
                                <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest block mb-2">Forma de Pagamento</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'MONEY', label: '💵 Dinheiro' },
                                        { id: 'PIX', label: '⚡ PIX' },
                                        { id: 'CREDIT_CARD', label: '💳 Crédito' },
                                        { id: 'DEBIT_CARD', label: '💳 Débito' },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setPaymentMethod(m.id)}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${paymentMethod === m.id ? 'bg-primary text-black border-primary' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button 
                                    className="btn btn-primary w-full py-3 font-bold text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                    onClick={() => handleSubmitOrder(true)}
                                    disabled={isSubmitting || orderItems.length === 0 || !selectedCustomer}
                                >
                                    <FaFileInvoiceDollar /> {isSubmitting ? 'Processando...' : 'Finalizar e Emitir NFS-e'}
                                </button>
                                <button 
                                    className="btn bg-gray-800 text-white hover:bg-gray-700 w-full py-3 font-bold flex items-center justify-center gap-2"
                                    onClick={() => handleSubmitOrder(false)}
                                    disabled={isSubmitting || orderItems.length === 0 || !selectedCustomer}
                                >
                                    <FaCheck /> Salvar Apenas (Sem Nota)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'HISTORICO' && (
                <div className="bg-[#050505] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                    <table className="hidden md:table w-full text-left">
                        <thead className="bg-[#111] text-gray-500 text-xs uppercase font-black border-b border-gray-800/50">
                            <tr>
                                <th className="p-4 lg:p-6">Data</th>
                                <th className="p-4 lg:p-6">Tomador (Cliente)</th>
                                <th className="p-4 lg:p-6">Valor Total</th>
                                <th className="p-4 lg:p-6">Status NFS-e</th>
                                <th className="p-4 lg:p-6 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/30">
                            {orders.map(order => (
                                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4 lg:p-6 text-gray-400 text-sm">
                                        {new Date(order.createdAt).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="p-4 lg:p-6">
                                        <div className="font-bold text-white">{order.customer?.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">{order.items.length} serviço(s)</div>
                                    </td>
                                    <td className="p-4 lg:p-6 font-mono text-white font-bold text-lg">
                                        {formatCurrency(order.total)}
                                    </td>
                                    <td className="p-4 lg:p-6">
                                        {order.nfseStatus === 'AUTORIZADA' && <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">Autorizada</span>}
                                        {order.nfseStatus === 'PROCESSANDO' && <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/20">Processando</span>}
                                        {order.nfseStatus === 'ERRO' && <span className="bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-500/20" title={order.nfseError}>Erro</span>}
                                        {order.nfseStatus === 'PENDENTE' && <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-xs font-bold border border-gray-700">Não Emitida</span>}
                                    </td>
                                    <td className="p-4 lg:p-6">
                                        <div className="flex justify-end gap-2">
                                            {order.nfseStatus === 'PENDENTE' || order.nfseStatus === 'ERRO' ? (
                                                <button className="btn btn-primary py-1 px-3 text-xs flex items-center gap-1" onClick={() => handleEmitNfse(order)} disabled={isSubmitting}>
                                                    Emitir
                                                </button>
                                            ) : null}
                                            {order.nfseStatus === 'PROCESSANDO' && (
                                                <button className="btn bg-gray-800 text-white py-1 px-3 text-xs flex items-center gap-1 hover:bg-gray-700" onClick={() => handleConsultNfse(order)} disabled={isSubmitting}>
                                                    <FaSync /> Consultar
                                                </button>
                                            )}
                                            {order.nfseStatus === 'AUTORIZADA' && order.nfsePdf && (
                                                <button className="btn btn-secondary py-1 px-3 text-xs" onClick={() => window.open(`https://api.focusnfe.com.br${order.nfsePdf}`, '_blank')}>
                                                    Ver Nota
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-500">Nenhuma ordem de serviço registrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                    <div className="md:hidden p-4 text-center text-gray-500 text-sm">
                        Visualize o histórico em uma tela maior.
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceOrders;
