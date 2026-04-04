import { useState, useEffect } from 'react';
import { FaUser, FaPhone, FaBuilding, FaIdCard, FaMapMarkerAlt, FaEnvelope, FaTimes, FaSave } from 'react-icons/fa';
import { addCustomer, updateCustomer } from '../services/dbService';

const CustomerFormModal = ({ isOpen, onClose, customerToEdit, storeId, onSaveSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        cpf: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        if (customerToEdit) {
            setFormData({
                name: customerToEdit.name || '',
                phone: customerToEdit.phone || '',
                cpf: customerToEdit.cpf || '',
                email: customerToEdit.email || '',
                address: customerToEdit.address || ''
            });
        } else {
            setFormData({
                name: '',
                phone: '',
                cpf: '',
                email: '',
                address: ''
            });
        }
    }, [customerToEdit, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) return alert('O nome é obrigatório');

        setLoading(true);
        try {
            let result;
            if (customerToEdit) {
                result = await updateCustomer(customerToEdit.id, formData);
            } else {
                result = await addCustomer(storeId, formData);
            }

            if (result.success) {
                onSaveSuccess(customerToEdit ? customerToEdit.id : result.id);
            } else {
                alert('Erro ao salvar cliente: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving customer:', error);
            alert('Erro ao salvar cliente');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <div className="bg-[#111] border border-gray-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
                    <h3 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="bg-amber-500/20 p-2 rounded-lg text-amber-500">
                            <FaUser size={20} />
                        </div>
                        {customerToEdit ? 'Editar Cliente' : 'Novo Cliente'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-2">
                        <FaTimes size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-[#0a0a0a]">
                    <div className="space-y-4">
                        <div className="relative group">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 block ml-1">Nome Completo *</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-amber-500 transition-colors">
                                    <FaUser size={14} />
                                </div>
                                <input
                                    autoFocus
                                    className="w-full bg-black/50 border border-gray-800 rounded-2xl pl-11 pr-4 py-4 text-white focus:outline-none focus:border-amber-500 transition-all font-medium"
                                    placeholder="Nome do cliente"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative group">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 block ml-1">Telefone</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-amber-500 transition-colors">
                                        <FaPhone size={14} />
                                    </div>
                                    <input
                                        className="w-full bg-black/50 border border-gray-800 rounded-2xl pl-11 pr-4 py-4 text-white focus:outline-none focus:border-amber-500 transition-all font-medium"
                                        placeholder="(00) 00000-0000"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="relative group">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 block ml-1">CPF</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-amber-500 transition-colors">
                                        <FaIdCard size={14} />
                                    </div>
                                    <input
                                        className="w-full bg-black/50 border border-gray-800 rounded-2xl pl-11 pr-4 py-4 text-white focus:outline-none focus:border-amber-500 transition-all font-medium"
                                        placeholder="000.000.000-00"
                                        value={formData.cpf}
                                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 block ml-1">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-amber-500 transition-colors">
                                    <FaEnvelope size={14} />
                                </div>
                                <input
                                    type="email"
                                    className="w-full bg-black/50 border border-gray-800 rounded-2xl pl-11 pr-4 py-4 text-white focus:outline-none focus:border-amber-500 transition-all font-medium"
                                    placeholder="email@cliente.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 block ml-1">Endereço</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 pt-4 pointer-events-none text-gray-500 group-focus-within:text-amber-500 transition-colors">
                                    <FaMapMarkerAlt size={14} />
                                </div>
                                <textarea
                                    className="w-full bg-black/50 border border-gray-800 rounded-2xl pl-11 pr-4 py-4 text-white focus:outline-none focus:border-amber-500 transition-all font-medium min-h-[100px] resize-none"
                                    placeholder="Rua, Número, Bairro, Cidade - UF"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-4 px-6 rounded-2xl bg-gray-900/50 text-gray-400 font-bold hover:bg-gray-800 hover:text-white transition-all active:scale-95"
                        >
                            CANCELAR
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-2 py-4 px-8 rounded-2xl bg-amber-500 text-black font-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                                <><FaSave /> SALVAR CLIENTE</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CustomerFormModal;
