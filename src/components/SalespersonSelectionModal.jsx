import React from 'react';
import { FaUserTie, FaTimes, FaCheck } from 'react-icons/fa';

const SalespersonSelectionModal = ({ isOpen, onClose, sellers, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div className="bg-[#1e293b] rounded-xl shadow-2xl w-full max-w-md border border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#0f172a]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaUserTie className="text-primary" /> Selecione o Vendedor
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <p className="text-gray-400 text-sm mb-4 text-center">
                        Quem atendeu este cliente?
                    </p>

                    <div className="flex flex-col gap-2">
                        {sellers.map((seller) => (
                            <button
                                key={seller.id}
                                onClick={() => onSelect(seller)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') onSelect(seller);
                                }}
                                className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-[#0f172a] hover:bg-gray-700 hover:border-primary transition-all group focus:border-primary focus:ring-2 focus:ring-primary/50 outline-none"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-primary font-bold text-lg border border-gray-600">
                                        {seller.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-white text-lg group-hover:text-primary transition-colors">
                                            {seller.name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {seller.role === 'MANAGER' ? 'Gerente' : 'Vendedor'}
                                        </div>
                                    </div>
                                </div>
                                <FaCheck className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-700 bg-[#0f172a] text-center">
                    <button onClick={onClose} className="text-gray-400 text-sm hover:text-white underline">
                        Cancelar Venda
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SalespersonSelectionModal;
