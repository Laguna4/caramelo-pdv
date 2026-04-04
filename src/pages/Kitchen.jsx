import { useState, useEffect } from 'react';
import { FaFire, FaCheck, FaExclamationTriangle, FaUtensils } from 'react-icons/fa';
import { getCurrentStore } from '../utils/storage';
import { subscribeToActiveComandas, updateComanda } from '../services/comandaService';
import { useNavigate } from 'react-router-dom';

const Kitchen = () => {
    const navigate = useNavigate();
    const [currentStore, setCurrentStore] = useState(null);
    const [comandas, setComandas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const store = getCurrentStore();
        if (!store) {
            navigate('/login');
            return;
        }

        if (!store.enableComandas) {
            alert("Módulo de cozinha não ativado.");
            navigate('/dashboard');
            return;
        }

        setCurrentStore(store);

        const unsubscribe = subscribeToActiveComandas(store.id, (data) => {
            // Sort to show oldest comandas first
            setComandas(data.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate]);

    const handleChangeItemStatus = async (comanda, itemIndex, newStatus) => {
        const updatedItems = [...comanda.itens];
        updatedItems[itemIndex].status_cozinha = newStatus;

        try {
            await updateComanda(currentStore.id, comanda.id, {
                itens: updatedItems
            });
        } catch (error) {
            alert("Erro ao atualizar o status do item.");
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#050505] text-white">Carregando Tela Cozinha...</div>;

    // Filter to get only items that need kitchen attention
    const activeOrders = comandas.map(comanda => {
        const pendingItems = (comanda.itens || []).map((item, idx) => ({ ...item, originalIndex: idx }))
            .filter(item => item.status_cozinha === 'pendente' || item.status_cozinha === 'preparando')
            .sort((a, b) => {
                const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
                const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
                return timeA - timeB;
            });
        return {
            ...comanda,
            pendingItems
        };
    }).filter(c => c.pendingItems.length > 0);

    const readyOrders = comandas.map(comanda => {
        const readyItems = (comanda.itens || []).map((item, idx) => ({ ...item, originalIndex: idx }))
            .filter(item => item.status_cozinha === 'pronto')
            .sort((a, b) => {
                const timeA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
                const timeB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
                return timeA - timeB;
            });
        return {
            ...comanda,
            readyItems
        };
    }).filter(c => c.readyItems.length > 0);

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white p-4 md:p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <FaFire className="text-orange-500" /> Cozinha & Produção
                    </h2>
                    <p className="text-gray-500 text-sm">Pedidos em tempo real para preparo.</p>
                </div>
            </div>

            {activeOrders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                    <FaCheck size={60} className="text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold">Nenhum Pedido Pendente</h2>
                    <p>A cozinha está tranquila.</p>
                </div>
            ) : (
                <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
                    <div className="flex gap-4 h-full">
                        {activeOrders.map(comanda => (
                            <div key={comanda.id} className="min-w-[300px] w-[300px] bg-[#111] border-2 border-orange-500/20 rounded-2xl flex flex-col overflow-hidden shadow-lg shrink-0">
                                <div className="bg-orange-600/20 p-4 border-b border-orange-500/30 flex justify-between items-center">
                                    <h3 className="font-bold text-xl text-orange-400">{comanda.identificador}</h3>
                                    <span className="text-xs bg-orange-900 text-orange-300 px-2 py-1 rounded-full font-mono font-bold">
                                        {comanda.pendingItems.length} itens
                                    </span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                                    {comanda.pendingItems.map(item => (
                                        <div
                                            key={item.originalIndex}
                                            className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${item.status_cozinha === 'preparando'
                                                ? 'bg-yellow-900/10 border-yellow-500/50'
                                                : 'bg-black border-gray-800'
                                                }`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-1 gap-2">
                                                    <div className="flex font-bold text-lg leading-tight gap-2 flex-1">
                                                        <span className="text-orange-500">{item.quantity}x</span> {item.name}
                                                    </div>
                                                    {item.addedAt && (
                                                        <div className="bg-black/50 border border-gray-700 text-gray-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold shrink-0">
                                                            {new Date(item.addedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                                {item.obs && (
                                                    <div className="text-sm bg-red-900/20 border border-red-900/50 text-red-400 p-2 rounded-lg flex gap-2 font-bold uppercase mt-2">
                                                        <FaExclamationTriangle className="shrink-0 mt-0.5" />
                                                        {item.obs}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                                {item.status_cozinha === 'pendente' && (
                                                    <button
                                                        onClick={() => handleChangeItemStatus(comanda, item.originalIndex, 'preparando')}
                                                        className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 border border-yellow-600/50 py-2 rounded-lg font-bold text-xs uppercase"
                                                    >
                                                        Preparar
                                                    </button>
                                                )}
                                                {item.status_cozinha === 'preparando' && (
                                                    <button
                                                        onClick={() => handleChangeItemStatus(comanda, item.originalIndex, 'pendente')}
                                                        className="bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 rounded-lg font-bold text-xs uppercase"
                                                    >
                                                        Voltar
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleChangeItemStatus(comanda, item.originalIndex, 'pronto')}
                                                    className="bg-green-600/20 hover:bg-green-600/40 text-green-500 border border-green-600/50 py-2 rounded-lg font-bold flex items-center justify-center gap-1 text-xs uppercase col-span-1"
                                                >
                                                    <FaCheck /> PRONTO
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {readyOrders.length > 0 && (
                <div className="mt-8 shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-green-500">
                        <FaCheck /> Pedidos Prontos (Aguardando Entrega)
                    </h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {readyOrders.map(comanda => (
                            <div key={comanda.id} className="min-w-[280px] w-[280px] bg-[#111] border border-green-500/30 rounded-2xl p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                                    <h3 className="font-bold text-green-400">{comanda.identificador}</h3>
                                    <span className="text-[10px] bg-green-900/30 text-green-500 px-2 py-0.5 rounded-full font-bold uppercase">Pronto</span>
                                </div>
                                <div className="space-y-2">
                                    {comanda.readyItems.map(item => (
                                        <div key={item.originalIndex} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300">
                                                <span className="text-green-500 font-bold">{item.quantity}x</span> {item.name}
                                            </span>
                                            <button
                                                onClick={() => handleChangeItemStatus(comanda, item.originalIndex, 'entregue')}
                                                className="bg-green-600 hover:bg-green-500 text-white text-[10px] px-3 py-1 rounded-lg font-bold uppercase transition-colors"
                                            >
                                                Entregar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Kitchen;
