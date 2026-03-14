import { useState, useEffect } from 'react';
import { FaSave, FaStore, FaTrashAlt, FaDatabase, FaCog, FaCheckCircle, FaLock, FaPrint, FaFileInvoiceDollar, FaUtensils } from 'react-icons/fa'; // Added FaLock, FaPrint, FaFileInvoiceDollar, FaUtensils
import { getCurrentStore, saveStore, clearAllStorage, getStorageData } from '../utils/storage';
import { updateUserPassword, validateCurrentPassword } from '../services/authService';
import { updateStore, addSeller, addCustomer } from '../services/dbService'; // Added missing imports
import PinModal from '../components/PinModal';
import { exportBackup, restoreBackup } from '../utils/storage';
import { FaCloudDownloadAlt, FaCloudUploadAlt } from 'react-icons/fa';

const BackupSection = () => {
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        const result = await exportBackup();
        if (result.success) {
            alert("Backup gerado! O download começou.");
        } else {
            alert("Erro ao criar backup: " + (result.error || "Desconhecido"));
        }
        setLoading(false);
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (confirm("⚠️ PERIGO: Restaurar um backup vai APAGAR todos os dados atuais e substituir pelos do arquivo.\n\nTem certeza que quer continuar?")) {
            setLoading(true);
            const result = await restoreBackup(file);
            setLoading(false);

            if (result.success) {
                alert("Backup restaurado com sucesso! A página será recarregada.");
                window.location.reload();
            } else {
                alert("Erro ao restaurar: " + (result.error || "Arquivo inválido"));
            }
        }
        e.target.value = null; // Reset input
    };

    return (
        <div className="bg-gray-900 border border-green-900/30 p-6 rounded-2xl mb-8">
            <h3 className="text-xl font-bold text-green-400 mb-4 flex items-center gap-2">
                <FaDatabase /> Backup & Segurança
            </h3>
            <p className="text-gray-400 mb-4 text-sm">
                Salve seus dados no computador para não perder nada se limpar o navegador.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={handleExport}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
                >
                    <FaCloudDownloadAlt /> FAZER BACKUP (SALVAR)
                </button>

                <label className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer">
                    <FaCloudUploadAlt />
                    <span>{loading ? 'Restaurando...' : 'RESTAURAR DE ARQUIVO'}</span>
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImport}
                        className="hidden"
                        disabled={loading}
                    />
                </label>
            </div>
        </div>
    );
};

const Settings = () => {
    const [storeData, setStoreData] = useState({
        id: '',
        name: '',
        ownerName: '',
        cnpj: '', // Added CNPJ
        address: '',
        phone: '',
        receiptFooter: 'Obrigado pela preferência!',
        adminPin: '', // New custom Admin PIN
        enableComandas: false,
        enableServiceTax: false
    });
    const [isLoading, setIsLoading] = useState(false);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Printer Settings State
    const [printerSettings, setPrinterSettings] = useState({
        receiptPrinter: 'thermal_80', // default
        ticketPrinter: 'none',
        autoPrint: true
    });

    const [saved, setSaved] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Lock Settings by default
    const [showPinModal, setShowPinModal] = useState(true);

    useEffect(() => {
        // ... (existing load logic)
        const current = getCurrentStore();
        if (current) {
            setStoreData({
                id: current.id,
                name: current.name || '',
                ownerName: current.ownerName || '',
                cnpj: current.cnpj || '', // Load CNPJ
                address: current.address || '',
                phone: current.phone || '',
                receiptFooter: current.receiptFooter || 'Obrigado pela preferência!',
                adminPin: current.adminPin || '',
                enableComandas: current.enableComandas || false,
                enableServiceTax: current.enableServiceTax || false,
                focusToken: current.focusToken || '',
                nfeEnvironment: current.nfeEnvironment || '2', // 1=Production, 2=Homologation
                nfeCrt: current.nfeCrt || '1' // 1=Simples Nacional, 3=Regime Normal
            });
        }

        // Load Printer Settings
        const savedPrinter = localStorage.getItem('caramelo_printer_settings');
        if (savedPrinter) {
            setPrinterSettings(JSON.parse(savedPrinter));
        }
    }, []);

    const handleChange = (e) => {
        setStoreData({ ...storeData, [e.target.name]: e.target.value });
        setSaved(false);
    };

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        let passwordUpdated = false;

        try {
            // 1. Prepare Update Object
            const storeUpdates = {
                name: storeData.name,
                ownerName: storeData.ownerName,
                cnpj: storeData.cnpj,
                address: storeData.address,
                phone: storeData.phone,
                receiptFooter: storeData.receiptFooter,
                adminPin: storeData.adminPin,
                enableComandas: storeData.enableComandas,
                enableServiceTax: storeData.enableServiceTax,
                focusToken: storeData.focusToken,
                nfeEnvironment: storeData.nfeEnvironment,
                nfeCrt: storeData.nfeCrt
            };

            // Validation: PIN numeric
            if (storeData.adminPin && !/^\d+$/.test(storeData.adminPin)) {
                alert("O PIN Mestre deve conter apenas números!");
                setIsLoading(false);
                return;
            }

            // 2. Handle Password Update if provided
            if (passwordData.newPassword) {
                if (!passwordData.currentPassword) {
                    alert("Para alterar a senha, digite sua SENHA ATUAL.");
                    setIsLoading(false);
                    return;
                }
                if (passwordData.newPassword !== passwordData.confirmPassword) {
                    alert("As novas senhas não conferem!");
                    setIsLoading(false);
                    return;
                }
                if (passwordData.newPassword.length < 6) {
                    alert("A nova senha deve ter no mínimo 6 caracteres.");
                    setIsLoading(false);
                    return;
                }

                // Verify Current Password First
                const authCheck = await validateCurrentPassword(passwordData.currentPassword);
                if (!authCheck.success) {
                    alert("Senha ATUAL incorreta. Tente novamente.");
                    setIsLoading(false);
                    return;
                }

                const result = await updateUserPassword(passwordData.newPassword);
                if (result.success) {
                    passwordUpdated = true;
                    // No need to store password in firebase doc, it's in Auth
                } else {
                    alert("Erro ao atualizar senha: " + result.error);
                    setIsLoading(false);
                    return;
                }
            }

            // 3. Save Everything to Firestore
            const dbResult = await updateStore(storeData.id, storeUpdates);
            if (!dbResult.success) {
                throw new Error(dbResult.error || "Erro ao salvar no banco online");
            }

            // 4. Update Local Session
            const updatedLocalStore = { ...storeData, ...storeUpdates };
            saveStore(updatedLocalStore);
            localStorage.setItem('caramelo_current_store', JSON.stringify(updatedLocalStore));

            // Save Printer Settings
            localStorage.setItem('caramelo_printer_settings', JSON.stringify(printerSettings));

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);

            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

            if (passwordUpdated) {
                alert('👑 Configurações e SENHA salvas com sucesso!');
            } else {
                alert('✅ Configurações salvas com sucesso!');
            }
        } catch (error) {
            console.error("Save error:", error);
            alert("Erro ao salvar: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetData = async () => {
        if (confirm('ATENÇÃO: Isso apagará TODOS os dados (Produtos, Vendas, Clientes). Deseja continuar?')) {
            const password = prompt("Para confirmar a exclusão, digite sua SENHA DE ADMIN:");
            if (!password) return;

            const authCheck = await validateCurrentPassword(password);
            if (!authCheck.success) {
                alert("Senha incorreta! Operação cancelada.");
                return;
            }

            if (confirm('Tem certeza absoluta? Essa ação não pode ser desfeita.')) {
                clearAllStorage();
                alert('Sistema resetado com sucesso.');
                window.location.reload();
            }
        }
    };

    const handleReset = () => {
        if (confirm('ATENÇÃO: Isso apagará todos os dados locais. Deseja continuar?')) {
            // clearAllStorage(); // Disable strict clear for now or handle appropriately
            alert('Função desabilitada para proteção.');
        }
    };

    const handleMigrateData = async () => {
        const currentStore = getCurrentStore();
        if (!currentStore) {
            alert('Erro: Loja não identificada. Recarregue a página.');
            return;
        }

        if (!confirm('Deseja enviar seus Vendedores e Clientes locais para o banco online?')) return;

        setIsLoading(true);
        let migratedSellers = 0;
        let migratedCustomers = 0;

        try {
            // Migrate Sellers
            const localSellers = getStorageData('SELLERS') || [];
            for (const seller of localSellers) {
                if (seller.storeId === currentStore.id) {
                    await addSeller(currentStore.id, seller);
                    migratedSellers++;
                }
            }

            // Migrate Customers
            const localCustomers = getStorageData('CUSTOMERS') || [];
            for (const customer of localCustomers) {
                if (customer.storeId === currentStore.id) {
                    await addCustomer(currentStore.id, customer);
                    migratedCustomers++;
                }
            }

            alert(`Migração Concluída!\n\n✅ Vendedores: ${migratedSellers} \n✅ Clientes: ${migratedCustomers} `);
        } catch (error) {
            console.error(error);
            alert('Erro na migração: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container-center" style={{ padding: '2rem', maxWidth: '800px' }}>
            <PinModal
                isOpen={showPinModal && !isAuthenticated}
                onClose={() => window.history.back()} // Go back if denied/closed
                onSuccess={() => { setIsAuthenticated(true); setShowPinModal(false); }}
                title="Acesso Restrito"
                requiredRole="ADMIN" // Requires Admin PIN
            />

            {isAuthenticated && (
                <>
                    <div className="flex-between mb-4">
                        <h1 style={{ fontSize: '1.8rem', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                            <FaCog className="mr-2" style={{ color: 'var(--primary)' }} /> Configurações da Loja
                        </h1>
                    </div>

                    {/* Migration Section */}
                    <div className="bg-gray-900 border border-blue-900/30 p-6 rounded-2xl mb-8">
                        <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                            <FaDatabase /> Sincronização de Dados
                        </h3>
                        <p className="text-gray-400 mb-4 text-sm">
                            Seus Vendedores e Clientes antigos sumiram da lista? Use este botão para enviar os dados antigos para o novo sistema online.
                        </p>
                        <button
                            onClick={handleMigrateData}
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Enviando...' : '📥 Migrar Dados Locais (Recuperar)'}
                        </button>
                    </div>

                    {/* BACKUP SECTION */}
                    <BackupSection />

                    <div className="modal-premium p-6">
                        <form onSubmit={handleSave}>
                            <div className="mb-6">
                                <h3 className="text-white border-b border-gray-800 pb-2 mb-4 flex items-center gap-2">
                                    <FaStore className="text-primary" /> Informações do Estabelecimento
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="input-label-premium">Nome da Loja</label>
                                        <input
                                            name="name"
                                            className="input-premium"
                                            value={storeData.name}
                                            onChange={handleChange}
                                            placeholder="Ex: Minha Loja"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label-premium">Nome do Responsável</label>
                                        <input
                                            name="ownerName"
                                            className="input-premium"
                                            value={storeData.ownerName}
                                            onChange={handleChange}
                                            placeholder="Seu Nome"
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label-premium">CNPJ (Opcional)</label>
                                        <input
                                            name="cnpj"
                                            className="input-premium"
                                            value={storeData.cnpj}
                                            onChange={handleChange}
                                            placeholder="00.000.000/0000-00"
                                        />
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="input-label-premium">Endereço (Para Recibo)</label>
                                    <input
                                        name="address"
                                        className="input-premium"
                                        value={storeData.address}
                                        onChange={handleChange}
                                        placeholder="Rua, Número, Cidade..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="input-label-premium">Telefone / Contato</label>
                                        <input
                                            name="phone"
                                            className="input-premium"
                                            value={storeData.phone}
                                            onChange={handleChange}
                                            placeholder="(00) 0000-0000"
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label-premium">Rodapé do Recibo</label>
                                        <input
                                            name="receiptFooter"
                                            className="input-premium"
                                            value={storeData.receiptFooter}
                                            onChange={handleChange}
                                            placeholder="Mensagem final do cupom"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* FISCAL MODULE SECTION */}
                            <div className="mb-6 border-t border-gray-800 pt-6">
                                <h3 className="text-white border-b border-gray-800 pb-2 mb-4 flex items-center gap-2">
                                    <FaFileInvoiceDollar className="text-primary" /> Emissão Fiscal (NFC-e / NF-e)
                                </h3>

                                <div className="mb-4">
                                    <label className="input-label-premium">Token API (Focus NFe)</label>
                                    <input
                                        name="focusToken"
                                        type="password"
                                        className="input-premium font-mono"
                                        value={storeData.focusToken || ''}
                                        onChange={handleChange}
                                        placeholder="Cole o token da sua conta Focus NFe"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="input-label-premium">Ambiente Sefaz</label>
                                        <select
                                            name="nfeEnvironment"
                                            className="input-premium"
                                            value={storeData.nfeEnvironment}
                                            onChange={handleChange}
                                        >
                                            <option value="2">Homologação (Testes)</option>
                                            <option value="1">Produção (Validade Jurídica)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="input-label-premium">Regime Tributário (CRT)</label>
                                        <select
                                            name="nfeCrt"
                                            className="input-premium"
                                            value={storeData.nfeCrt}
                                            onChange={handleChange}
                                        >
                                            <option value="1">1 - Simples Nacional</option>
                                            <option value="3">3 - Regime Normal</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                                    <div className="text-sm text-gray-400">
                                        Para enviar seu Certificado Digital A1 (.pfx), faça login diretamente no painel da Focus NFe utilizando a sua conta.
                                    </div>
                                </div>
                            </div>

                            {/* RESTAURANT / BARS MODULE */}
                            <div className="mb-6 border-t border-gray-800 pt-6">
                                <h3 className="text-white border-b border-gray-800 pb-2 mb-4 flex items-center gap-2">
                                    <FaUtensils className="text-primary" /> Módulos Opcionais
                                </h3>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                                        <div>
                                            <div className="font-bold text-white text-lg flex items-center gap-2">
                                                Mesas e Comandas (Bares/Restaurantes)
                                                {storeData.enableComandas && <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full uppercase font-black">Ativo</span>}
                                            </div>
                                            <p className="text-gray-500 text-sm">Habilita as telas "Mesas" p/ garçons (Mobile) e "Cozinha" p/ preparo (KDS).</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={storeData.enableComandas}
                                                onChange={(e) => setStoreData({ ...storeData, enableComandas: e.target.checked })}
                                            />
                                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>

                                    {storeData.enableComandas && (
                                        <div className="flex items-center justify-between p-4 bg-gray-900/20 rounded-xl border border-gray-800 ml-4 border-l-4 border-l-primary">
                                            <div>
                                                <div className="font-bold text-white">Taxa de Serviço Automática (+10%)</div>
                                                <p className="text-gray-500 text-sm">Adiciona automaticamente 10% do garçom no PDV ao fechar a mesa.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={storeData.enableServiceTax}
                                                    onChange={(e) => setStoreData({ ...storeData, enableServiceTax: e.target.checked })}
                                                />
                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* PRINTER SETTINGS SECTION */}
                            <div className="mb-6 border-t border-gray-800 pt-6">
                                <h3 className="text-white border-b border-gray-800 pb-2 mb-4 flex items-center gap-2">
                                    <FaPrint className="text-primary" /> Configuração de Impressão
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="input-label-premium">Impressora de Recibos (Venda)</label>
                                        <select
                                            className="input-premium"
                                            value={printerSettings.receiptPrinter}
                                            onChange={(e) => setPrinterSettings({ ...printerSettings, receiptPrinter: e.target.value })}
                                        >
                                            <option value="none">Não Imprimir (Apenas Tela)</option>
                                            <option value="thermal_80">Térmica 80mm (Padrão)</option>
                                            <option value="thermal_58">Térmica 58mm (Pequena)</option>
                                            <option value="a4_basic">A4 / Jato de Tinta (Folha Inteira)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="input-label-premium">Impressora de Vales/Trocas</label>
                                        <select
                                            className="input-premium"
                                            value={printerSettings.ticketPrinter}
                                            onChange={(e) => setPrinterSettings({ ...printerSettings, ticketPrinter: e.target.value })}
                                        >
                                            <option value="none">Igual à de Recibos</option>
                                            <option value="thermal_80">Térmica 80mm</option>
                                            <option value="thermal_58">Térmica 58mm</option>
                                        </select>
                                        <small className="text-gray-500">Usado ao imprimir comprovante de trocas.</small>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="flex items-center gap-2 text-white cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={printerSettings.autoPrint}
                                            onChange={(e) => setPrinterSettings({ ...printerSettings, autoPrint: e.target.checked })}
                                            className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-green-500 focus:ring-green-500/50"
                                        />
                                        <span>Imprimir Automaticamente ao Finalizar (Sem perguntar)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="mb-6 border-t border-gray-800 pt-6">
                                <h3 className="text-white border-b border-gray-800 pb-2 mb-4 flex items-center gap-2">
                                    <FaLock className="text-primary" /> Segurança
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', alignItems: 'end' }}>
                                    <div>
                                        <label className="input-label-premium">PIN Mestre (PDV)</label>
                                        <input
                                            name="adminPin"
                                            className="input-premium text-center font-bold tracking-widest"
                                            value={storeData.adminPin || ''}
                                            onChange={handleChange}
                                            placeholder="1234"
                                            maxLength={6}
                                            inputMode="numeric"
                                            autoComplete="new-password"
                                        />
                                        <small className="text-gray-500 block mt-1">Senha para liberar funções.</small>
                                    </div>
                                    <div>
                                        <label className="input-label-premium">Nova Senha de Login</label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            className="input-premium"
                                            value={passwordData.newPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="Deixe em branco para manter"
                                            minLength={6}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                    <div>
                                        <label className="input-label-premium">Confirmar Nova Senha</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            className="input-premium"
                                            value={passwordData.confirmPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="Repita a nova senha"
                                            minLength={6}
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </div>

                                {/* Current Password for Confirmation */}
                                <div className="mt-4">
                                    <label className="input-label-premium">Senha ATUAL (Necessária para salvar)</label>
                                    <input
                                        type="password"
                                        name="currentPassword"
                                        className="input-premium"
                                        value={passwordData.currentPassword}
                                        onChange={handlePasswordChange}
                                        placeholder="Sua senha de login atual"
                                        required={!!passwordData.newPassword}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end mb-8">
                                <button
                                    type="submit"
                                    className="btn btn-primary font-bold flex items-center gap-2"
                                    style={{ padding: '0.8rem 2rem' }}
                                >
                                    {saved ? <FaCheckCircle /> : <FaSave />}
                                    {saved ? 'Salvo!' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>

                        <div className="border-t border-gray-800 pt-6 mt-6">
                            <h3 className="text-red-500 border-b border-red-900/30 pb-2 mb-4 flex items-center gap-2">
                                <FaDatabase /> Zona de Perigo
                            </h3>
                            <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-4 flex-between">
                                <div>
                                    <h4 className="text-white font-bold m-0">Resetar Sistema</h4>
                                    <p className="text-gray-400 text-sm m-0 mt-1">Apaga todos os produtos, vendas e clientes cadastrados.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleResetData}
                                    className="btn bg-red-600 text-white hover:bg-red-700 font-bold border-none"
                                >
                                    <FaTrashAlt className="mr-2" /> FORMATAR DADOS
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Settings;
