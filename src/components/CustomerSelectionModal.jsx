import { useState, useEffect } from 'react';
import { FaUser, FaSearch, FaTimes, FaPlus } from 'react-icons/fa';

const CustomerSelectionModal = ({ isOpen, onClose, customers, onSelect, onAddNew }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState([]);

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredCustomers(customers);
        } else {
            const term = searchTerm.toLowerCase();
            setFilteredCustomers(customers.filter(c =>
                c.name.toLowerCase().includes(term) ||
                (c.cpf && c.cpf.includes(term)) ||
                (c.phone && c.phone.includes(term))
            ));
        }
    }, [searchTerm, customers]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="bg-[#111] border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-scaleUp flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="bg-caramelo-primary/20 p-2 rounded-lg text-caramelo-primary">
                            <FaUser size={20} />
                        </div>
                        Selecionar Cliente
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
                        <FaTimes size={24} />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-800 bg-black/40">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <FaSearch className="text-gray-500 group-focus-within:text-caramelo-primary transition-colors" />
                        </div>
                        <input
                            autoFocus
                            className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-white focus:outline-none focus:border-caramelo-primary transition-all text-lg font-medium"
                            placeholder="Buscar por nome, CPF ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-[#0a0a0a]">
                    {filteredCustomers.length > 0 ? (
                        <div className="space-y-2">
                            {filteredCustomers.map(customer => (
                                <button
                                    key={customer.id}
                                    onClick={() => onSelect(customer)}
                                    className="w-full p-5 rounded-2xl bg-gray-900/30 border border-gray-800 hover:border-caramelo-primary hover:bg-caramelo-primary/5 text-left transition-all group flex justify-between items-center"
                                >
                                    <div>
                                        <div className="font-bold text-white text-lg group-hover:text-caramelo-primary transition-colors uppercase tracking-tight">{customer.name}</div>
                                        <div className="text-xs text-gray-500 flex gap-4 mt-2 font-mono">
                                            {customer.cpf && <span>CPF: {customer.cpf}</span>}
                                            {customer.phone && <span>TEL: {customer.phone}</span>}
                                        </div>
                                    </div>
                                    <div className="bg-caramelo-primary/10 text-caramelo-primary rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                        Selecionar
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <FaUser size={48} className="mx-auto mb-4 text-gray-800" />
                            <p className="text-gray-600 font-bold uppercase tracking-widest text-xs">Nenhum cliente disponível</p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-800 bg-black/40 flex justify-between items-center">
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
                        {filteredCustomers.length} Clientes Encontrados
                    </p>
                    <button
                        onClick={onAddNew}
                        className="bg-white/5 hover:bg-white/10 text-white border border-white/10 py-3 px-6 rounded-xl font-bold transition-all flex items-center gap-2 active:scale-95"
                    >
                        <FaPlus className="text-caramelo-primary" /> Novo Cliente
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerSelectionModal;
