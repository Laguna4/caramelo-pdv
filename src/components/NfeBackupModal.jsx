import { useState, useEffect } from 'react';
import { FaTimes, FaCloudDownloadAlt, FaSpinner, FaCopy, FaCheck } from 'react-icons/fa';
import { getNfeBackups } from '../services/nfeService';
import { getCurrentStore } from '../utils/storage';

const NfeBackupModal = ({ isOpen, onClose }) => {
    const [backups, setBackups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [storeToken, setStoreToken] = useState('');
    const [copiedToken, setCopiedToken] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadBackups();
        }
    }, [isOpen]);

    const loadBackups = async () => {
        setIsLoading(true);
        setError('');
        try {
            const store = getCurrentStore();
            if (store) {
                setStoreToken(store.focusToken || '');
                const res = await getNfeBackups(store.id);
                if (res.success) {
                    // Sort descending by date
                    const sorted = res.backups.sort((a, b) => new Date(b.data) - new Date(a.data));
                    setBackups(sorted);
                } else {
                    setError(res.error || 'Erro ao carregar backups.');
                }
            } else {
                setError('Loja não encontrada.');
            }
        } catch (err) {
            setError('Erro inesperado ao buscar backups.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyToken = () => {
        navigator.clipboard.writeText(storeToken);
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
    };

    const handleDownload = (caminho) => {
        // Focus NFe API requires Basic Auth for backups. 
        // We open the URL in a new tab. The browser will prompt for username/password.
        // Username is the Focus Token, password is empty.
        const store = getCurrentStore();
        const env = store?.nfeEnvironment === '1' ? 'https://api.focusnfe.com.br' : 'https://homologacao.focusnfe.com.br';
        const url = `${env}${caminho}`;
        
        window.open(url, '_blank');
    };

    const formatMonthYear = (dateString) => {
        if (!dateString) return 'Desconhecido';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
            <div className="bg-[#111] border border-gray-800 p-6 rounded-3xl w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase tracking-wider">
                        <FaCloudDownloadAlt className="text-primary text-2xl" /> 
                        Exportar XMLs (Mensal)
                    </h2>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors bg-gray-900 p-2 rounded-full"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Instructions */}
                <div className="bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl mb-6">
                    <p className="text-blue-400 text-xs md:text-sm font-medium mb-3 leading-relaxed">
                        A Sefaz gera um arquivo compacto (ZIP) com todos os seus XMLs automaticamente todo dia 02 do mês seguinte. 
                        Para baixar, clique no mês desejado. 
                    </p>
                    <div className="bg-[#0a0a0a] border border-gray-800 p-3 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                        <div className="text-xs text-gray-400">
                            <span className="text-orange-400 font-bold">Aviso:</span> O navegador pode pedir um Usuário e Senha para baixar.<br/>
                            Cole o seu Token no campo <b>Usuário</b> e deixe a <b>Senha em branco</b>.
                        </div>
                        <button 
                            onClick={handleCopyToken}
                            className="btn bg-gray-800 text-white hover:bg-gray-700 py-2 px-3 text-[10px] font-bold flex items-center gap-2 whitespace-nowrap"
                        >
                            {copiedToken ? <FaCheck className="text-green-500" /> : <FaCopy />}
                            {copiedToken ? 'TOKEN COPIADO!' : 'COPIAR MEU TOKEN'}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                            <FaSpinner className="animate-spin text-4xl mb-4 text-primary" />
                            <p className="font-bold uppercase tracking-widest text-xs">Buscando backups na Sefaz...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-900/20 border border-red-900/50 p-6 rounded-xl text-center">
                            <p className="text-red-400 font-bold mb-2">{error}</p>
                            <button className="btn btn-secondary text-xs mt-2" onClick={loadBackups}>Tentar Novamente</button>
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                            <FaCloudDownloadAlt className="text-4xl text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500 font-bold uppercase text-xs">Nenhum backup disponível ainda.</p>
                            <p className="text-gray-600 text-[10px] mt-1">Lembre-se: O arquivo do mês só é gerado no dia 02 do mês seguinte.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {backups.map((backup, idx) => (
                                <div key={idx} className="bg-[#1a1a1a] border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-primary/50 transition-all group">
                                    <div>
                                        <div className="text-white font-black uppercase text-sm mb-1 group-hover:text-primary transition-colors">
                                            {formatMonthYear(backup.data)}
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono">
                                            CNPJ: {backup.cnpj} • Tipo: {backup.tipo}
                                        </div>
                                    </div>
                                    <button 
                                        className="bg-primary/10 text-primary hover:bg-primary hover:text-black border border-primary/20 p-3 rounded-xl transition-all"
                                        onClick={() => handleDownload(backup.caminho_arquivo)}
                                        title="Baixar ZIP"
                                    >
                                        <FaCloudDownloadAlt size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default NfeBackupModal;
