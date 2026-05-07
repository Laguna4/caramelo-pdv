import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaCut, FaTimes, FaSave, FaLock } from 'react-icons/fa';
import { getServices, addService, updateService, deleteService, getStore } from '../services/dbService';
import { getCurrentStore, getCurrentUser } from '../utils/storage';
import { formatCurrency } from '../utils/calculations';
import PinModal from '../components/PinModal';
import { useNavigate } from 'react-router-dom';

const ServicesCatalog = () => {
    const [services, setServices] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [currentStore, setCurrentStore] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        codigoServicoMunicipio: '',
        cnae: '',
        issRate: ''
    });

    // Security State
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
            loadServices(store.id);
            // set default CNAE and Municipal Code from store settings if available
            setFormData(prev => ({
                ...prev,
                cnae: store.cnaePadrao || '',
                codigoServicoMunicipio: store.codigoTributacaoMunicipioPadrao || ''
            }));
        }
    }, []);

    const loadServices = async (storeId) => {
        if (!storeId) return;
        const storeServices = await getServices(storeId);
        setServices(storeServices);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price) {
            alert('Preencha o Nome e o Preço Padrão do serviço.');
            return;
        }

        const serviceData = {
            ...formData,
            price: parseFloat(formData.price) || 0,
            issRate: parseFloat(formData.issRate) || 0
        };

        if (editingService) {
            await updateService(editingService.id, serviceData);
        } else {
            await addService(currentStore.id, {
                ...serviceData,
                createdAt: new Date().toISOString()
            });
        }

        loadServices(currentStore.id);
        resetForm();
    };

    const handleEdit = (service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            price: service.price,
            codigoServicoMunicipio: service.codigoServicoMunicipio || '',
            cnae: service.cnae || '',
            issRate: service.issRate || ''
        });
        setShowForm(true);
    };

    const handleDelete = async (serviceId) => {
        if (authorizedUser?.role !== 'ADMIN' && authorizedUser?.role !== 'OWNER' && !authorizedUser?.permissions?.includes('delete_product')) {
            alert('Acesso Negado: Você não tem permissão para EXCLUIR serviços.');
            return;
        }

        if (confirm('Tem certeza que deseja excluir este serviço?')) {
            await deleteService(serviceId);
            loadServices(currentStore.id);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            price: '',
            codigoServicoMunicipio: currentStore?.codigoTributacaoMunicipioPadrao || '',
            cnae: currentStore?.cnaePadrao || '',
            issRate: ''
        });
        setEditingService(null);
        setShowForm(false);
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.codigoServicoMunicipio?.includes(searchTerm)
    );

    if (!authorizedUser) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white relative">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-10" />
                <PinModal
                    isOpen={showPinModal}
                    onClose={() => navigate('/dashboard')}
                    title="Acesso Restrito: Catálogo de Serviços"
                    requiredRole="MANAGER"
                    requiredPermission="products"
                    onSuccess={(user) => {
                        setAuthorizedUser(user);
                        setShowPinModal(false);
                    }}
                />
                <div className="z-0 text-center opacity-50">
                    <FaLock size={64} className="mx-auto mb-4 text-gray-700" />
                    <h1 className="text-2xl font-bold">Aguardando Autorização...</h1>
                </div>
            </div>
        );
    }

    if (!showForm) {
        return (
            <div className="container" style={{ padding: '2rem' }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h1 className="text-xl md:text-[1.8rem] font-bold flex items-center gap-2" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                        <FaCut style={{ color: 'var(--primary)' }} /> Catálogo de Serviços
                    </h1>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <button className="btn btn-primary flex-1 md:flex-none py-2 px-4 text-sm font-bold shadow-lg shadow-primary/20" onClick={() => setShowForm(true)}>
                            <FaPlus /> Novo Serviço
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="card mb-6 p-4 flex items-center gap-4 bg-[#0a0a0a] border-gray-800 shadow-xl">
                    <FaSearch className="text-primary text-xl" />
                    <input
                        className="w-full bg-transparent border-none text-white text-lg outline-none placeholder-gray-600"
                        placeholder="Pesquisar por Nome do Serviço ou Código Municipal..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Services Grid */}
                <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                    <table className="hidden md:table w-full text-left">
                        <thead className="bg-[#111] text-gray-500 text-xs uppercase font-black border-b border-gray-800/50">
                            <tr>
                                <th className="p-6">Nome do Serviço</th>
                                <th className="p-6 text-center">CNAE</th>
                                <th className="p-6 text-center">Cód. Município</th>
                                <th className="p-6 text-right">Alíquota ISS</th>
                                <th className="p-6 text-right">Preço Padrão</th>
                                <th className="p-6 text-right">Opções</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/30">
                            {filteredServices.map(service => (
                                <tr key={service.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-6 font-bold text-white text-lg">{service.name}</td>
                                    <td className="p-6 text-center text-gray-400 font-mono text-sm">{service.cnae || '-'}</td>
                                    <td className="p-6 text-center text-gray-400 font-mono text-sm">{service.codigoServicoMunicipio || '-'}</td>
                                    <td className="p-6 text-right text-gray-400 font-mono text-sm">
                                        {service.issRate ? `${service.issRate}%` : '-'}
                                    </td>
                                    <td className="p-6 text-right text-xl font-black text-white font-mono">
                                        {formatCurrency(service.price)}
                                    </td>
                                    <td className="p-6">
                                        <div className="flex justify-end gap-2">
                                            <button className="p-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-white hover:text-black transition-all" onClick={() => handleEdit(service)} title="Editar">
                                                <FaEdit />
                                            </button>
                                            <button className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-black transition-all" onClick={() => handleDelete(service.id)} title="Excluir">
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile View */}
                    <div className="md:hidden divide-y divide-gray-800/30">
                        {filteredServices.map(service => (
                            <div key={service.id} className="p-5 hover:bg-white/[0.01] transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-black text-white text-lg">{service.name}</h3>
                                        <div className="text-xs text-gray-500 mt-1">CNAE: {service.cnae || 'N/A'} | Cód: {service.codigoServicoMunicipio || 'N/A'}</div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-white font-mono">{formatCurrency(service.price)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4 justify-end">
                                    <button className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-300 active:scale-95" onClick={() => handleEdit(service)}>
                                        <FaEdit size={16} />
                                    </button>
                                    <button className="p-3 bg-red-900/10 border border-red-900/30 text-red-500 rounded-2xl active:scale-95" onClick={() => handleDelete(service.id)}>
                                        <FaTrash size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredServices.length === 0 && (
                        <div className="p-24 text-center text-gray-700">
                            <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800 shadow-xl">
                                <FaCut size={40} className="text-gray-800" />
                            </div>
                            <p className="font-black uppercase text-xs tracking-[0.3em] opacity-40">Nenhum serviço cadastrado</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="container-center" style={{ padding: '1rem', maxWidth: '800px' }}>
            <div className="modal-premium p-6 bg-[#050505] border border-gray-800/50 rounded-2xl shadow-3xl">
                <div className="flex-between mb-6 pb-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaCut className="text-primary" /> {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                    </h2>
                    <div className="flex gap-2">
                        <button className="btn btn-success py-2 px-6 font-bold flex items-center gap-2" onClick={handleSubmit}>
                            <FaSave /> Salvar
                        </button>
                        <button className="btn btn-danger py-2 px-4" onClick={resetForm}>
                            <FaTimes />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="md:col-span-2">
                            <label className="input-label-premium">Nome do Serviço *</label>
                            <input
                                name="name"
                                className="input-premium font-bold text-lg"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Ex: Banho e Tosa Completa"
                                required
                            />
                        </div>

                        <div>
                            <label className="input-label-premium">Preço Padrão (R$) *</label>
                            <input
                                type="number"
                                step="0.01"
                                name="price"
                                className="input-premium font-mono text-xl"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="0.00"
                                required
                            />
                        </div>

                        <div>
                            <label className="input-label-premium text-primary">Alíquota ISS (%)</label>
                            <input
                                type="number"
                                step="0.01"
                                name="issRate"
                                className="input-premium"
                                value={formData.issRate}
                                onChange={handleChange}
                                placeholder="Ex: 5"
                            />
                            <small className="text-gray-500 mt-1 block">Deixe em branco para usar o padrão da prefeitura.</small>
                        </div>

                        <div>
                            <label className="input-label-premium text-primary">Código Serviço Município</label>
                            <input
                                name="codigoServicoMunicipio"
                                className="input-premium"
                                value={formData.codigoServicoMunicipio}
                                onChange={handleChange}
                                placeholder="Ex: 0504"
                            />
                            <small className="text-gray-500 mt-1 block">Obrigatório para emissão de NFS-e.</small>
                        </div>

                        <div>
                            <label className="input-label-premium text-primary">CNAE</label>
                            <input
                                name="cnae"
                                className="input-premium"
                                value={formData.cnae}
                                onChange={handleChange}
                                placeholder="Ex: 7500100"
                            />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ServicesCatalog;
