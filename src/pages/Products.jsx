import { checkLimit } from '../utils/plans';
import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaBarcode, FaSave, FaTimes, FaSearch, FaPrint, FaFileInvoiceDollar, FaLock, FaMoneyBillWave, FaExclamationTriangle, FaBoxOpen } from 'react-icons/fa';
import { getProducts, addProduct, updateProduct, deleteProduct, getStore } from '../services/dbService';
import { getCurrentStore } from '../utils/storage';
import { generateId, generateBarcode, formatCurrency, calculateMarkup, calculateSellPrice, calculateProfit } from '../utils/calculations';
import { CATEGORIES } from '../config';
import { useNavigate } from 'react-router-dom';
import JsBarcode from 'jsbarcode';
import { getCurrentUser } from '../utils/storage';
import PinModal from '../components/PinModal';
import TutorialModal from '../components/TutorialModal';
import NfeImportModal from '../components/NfeImportModal';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [currentStore, setCurrentStore] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showNfeModal, setShowNfeModal] = useState(false);

    // Tutorial
    const [showTutorial, setShowTutorial] = useState(false);
    const tutorialSteps = [
        {
            title: 'Cadastro de Produtos',
            content: 'Aqui você organiza seu estoque. Cadastre o nome, preço e a quantidade que você tem disponível.',
            icon: <FaBoxOpen className="text-white" />
        },
        {
            title: 'Preço de Venda Inteligente',
            content: 'Digite o preço de custo e a margem de lucro que deseja. O sistema calcula o preço final automaticamente pra você!',
            icon: <FaMoneyBillWave className="text-white" />
        },
        {
            title: 'Código de Barras',
            content: 'Você pode usar um leitor de código de barras ou gerar um código automático pelo sistema para imprimir etiquetas.',
            icon: <FaBarcode className="text-white" />
        },
        {
            title: 'Estoque Mínimo',
            content: 'Defina um estoque mínimo. O sistema te avisará quando o produto estiver acabando para você não ficar sem mercadoria.',
            icon: <FaExclamationTriangle className="text-white" />
        }
    ];
    const [currentStep, setCurrentStep] = useState(0);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: 'GENERAL',
        costPrice: '',
        markup: '',
        price: '',
        stock: '',
        minStock: '',
        barcode: '',
        unit: 'UN',
        location: '',
        // Fiscal Data (Optional)
        ncm: '',
        cfop: '5102', // Default: Venda
        origin: '0' // Default: Nacional
    });

    const [calculatedProfit, setCalculatedProfit] = useState(0);

    // Security State
    const [authorizedUser, setAuthorizedUser] = useState(null);
    const [showPinModal, setShowPinModal] = useState(false);
    const navigate = useNavigate();

    // Initial Security Check - Always require PIN for sensitive registration page
    useEffect(() => {
        setShowPinModal(true);
    }, []);

    useEffect(() => {
        const store = getCurrentStore();
        if (store) {
            setCurrentStore(store);
            loadProducts(store.id);

            // Tutorial Check
            const tutorialActive = localStorage.getItem('caramelo_tutorial_mode') !== 'false';
            const tutorialShown = localStorage.getItem('caramelo_tutorial_products_shown');
            if (tutorialActive && !tutorialShown) {
                setShowTutorial(true);
            }
        }
    }, []);

    const closeTutorial = () => {
        setShowTutorial(false);
        localStorage.setItem('caramelo_tutorial_products_shown', 'true');
    };

    // Update calculated profit whenever price or cost changes
    useEffect(() => {
        const cost = parseFloat(formData.costPrice) || 0;
        const price = parseFloat(formData.price) || 0;
        setCalculatedProfit(calculateProfit(cost, price));
    }, [formData.costPrice, formData.price]);

    const loadProducts = async (storeId) => {
        if (!storeId) return;
        const storeProducts = await getProducts(storeId);
        setProducts(storeProducts);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-calculations
        if (name === 'costPrice') {
            const newCost = parseFloat(value) || 0;
            const currentMarkup = parseFloat(formData.markup) || 0;
            if (currentMarkup) {
                const newPrice = calculateSellPrice(newCost, currentMarkup);
                setFormData(prev => ({ ...prev, price: newPrice.toFixed(2) }));
            }
        }

        if (name === 'markup') {
            const newMarkup = parseFloat(value) || 0;
            const currentCost = parseFloat(formData.costPrice) || 0;
            if (currentCost) {
                const newPrice = calculateSellPrice(currentCost, newMarkup);
                setFormData(prev => ({ ...prev, price: newPrice.toFixed(2) }));
            }
        }

        if (name === 'price') {
            const newPrice = parseFloat(value) || 0;
            const currentCost = parseFloat(formData.costPrice) || 0;
            if (currentCost && newPrice) {
                const newMarkup = calculateMarkup(currentCost, newPrice);
                setFormData(prev => ({ ...prev, markup: newMarkup.toFixed(2) }));
            }
        }
    };

    const handleGenerateBarcode = () => {
        setFormData({ ...formData, barcode: generateBarcode() });
    };



    // ... inside handleSubmit ...
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price) {
            alert('Preencha os campos obrigatórios');
            return;
        }

        // Check Limits (Only for new products)
        if (!editingProduct) {
            // Fetch FRESH store data to get real-time plan
            let activePlan = currentStore.plan || 'Start';
            try {
                const freshStore = await getStore(currentStore.id);
                if (freshStore && freshStore.plan) {
                    activePlan = freshStore.plan;
                }
            } catch (err) {
                console.error("Error fetching fresh plan:", err);
            }

            const { allowed, message } = checkLimit(activePlan, 'products', products.length);
            if (!allowed) {
                alert(message);
                return;
            }
        }

        const productData = {
            ...formData,
            price: parseFloat(formData.price),
            costPrice: parseFloat(formData.costPrice) || 0,
            stock: parseInt(formData.stock) || 0,
            minStock: parseInt(formData.minStock) || 0,
            markup: parseFloat(formData.markup) || 0,
            ncm: formData.ncm || '',
            cfop: formData.cfop || '',
            origin: formData.origin || '0'
        };

        if (editingProduct) {
            await updateProduct(editingProduct.id, productData);
        } else {
            await addProduct(currentStore.id, {
                ...productData,
                createdAt: new Date().toISOString()
            });
        }

        loadProducts(currentStore.id);
        resetForm();
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            category: product.category,
            costPrice: product.costPrice || '',
            markup: product.markup || '',
            price: product.price,
            stock: product.stock,
            minStock: product.minStock || '',
            barcode: product.barcode || '',
            unit: product.unit || 'UN',
            location: product.location || '',
            ncm: product.ncm || '',
            cfop: product.cfop || '5102',
            origin: product.origin || '0'
        });
        setShowForm(true);
    };

    const handleDelete = async (productId) => {
        if (authorizedUser?.role !== 'ADMIN' && authorizedUser?.role !== 'OWNER' && !authorizedUser?.permissions?.includes('delete_product')) {
            alert('Acesso Negado: Você não tem permissão para EXCLUIR produtos.');
            return;
        }

        if (confirm('Tem certeza que deseja excluir?')) {
            await deleteProduct(productId);
            loadProducts(currentStore.id);
        }
    };

    const handleNfeImport = async (items) => {
        try {
            for (const item of items) {
                if (item.existingProduct) {
                    const updatedStock = (parseInt(item.existingProduct.stock) || 0) + (parseInt(item.quantity) || 0);
                    await updateProduct(item.existingProduct.id, {
                        stock: updatedStock,
                        costPrice: item.costPrice
                    });
                } else {
                    await addProduct(currentStore.id, {
                        name: item.name,
                        barcode: item.barcode,
                        costPrice: item.costPrice,
                        price: item.costPrice * 1.5, // Default 50% markup
                        markup: 50,
                        stock: item.quantity,
                        unit: item.unit,
                        category: 'GENERAL',
                        createdAt: new Date().toISOString()
                    });
                }
            }
            loadProducts(currentStore.id);
            alert(`${items.length} itens processados com sucesso!`);
        } catch (err) {
            console.error("Erro na importação:", err);
            alert("Alguns itens não puderam ser importados.");
        }
    };

    const resetForm = () => {
        setFormData({
            name: '', category: 'GENERAL', costPrice: '', markup: '',
            price: '', stock: '', minStock: '', barcode: '', unit: 'UN', location: '',
            ncm: '', cfop: '5102', origin: '0'
        });
        setEditingProduct(null);
        setShowForm(false);
    };

    // === LABEL PRINTING LOGIC ===
    const [showLabelModal, setShowLabelModal] = useState(false);
    const [labelDate, setLabelDate] = useState(new Date().toISOString().split('T')[0]);
    const [labelSearchTerm, setLabelSearchTerm] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('PIMACO_6180');
    const [qtyMode, setQtyMode] = useState('STOCK'); // Default to STOCK as per user request
    const [productsToLabel, setProductsToLabel] = useState([]); // Products visible in modal
    const [selectedIds, setSelectedIds] = useState(new Set()); // IDs selected for printing

    const LABEL_TEMPLATES = {
        'PIMACO_6180': { name: 'Pimaco 6180 (30/pág) - 66x25mm', cols: 3, rows: 10, width: '66.7mm', height: '25.4mm', marginX: '2mm', marginY: '0mm' },
        'PIMACO_6181': { name: 'Pimaco 6181 (20/pág) - 101x25mm', cols: 2, rows: 10, width: '101.6mm', height: '25.4mm', marginX: '2mm', marginY: '0mm' },
        'PIMACO_6080': { name: 'Pimaco 6080 (60/pág) - 33x12mm', cols: 5, rows: 12, width: '33.9mm', height: '12.7mm', marginX: '1mm', marginY: '0mm' },
        'PIMACO_33': { name: 'Pimaco Adesivo (33/pág) - 63.5x25.4mm', cols: 3, rows: 11, width: '63.5mm', height: '25.4mm', marginX: '2.5mm', marginY: '0mm' },
        'A4_LIST': { name: 'Lista Simples A4', cols: 1, rows: 20, width: '100%', height: 'auto', marginX: '0', marginY: '5px' }
    };

    // Effect to update the list when Modal opens or Date/Search changes
    useEffect(() => {
        if (!showLabelModal) return;

        let filtered = products;

        // Filter by Date
        if (labelDate) {
            filtered = filtered.filter(p => {
                const dateA = p.createdAt && typeof p.createdAt === 'string' ? p.createdAt.substr(0, 10) : (p.createdAt?.toDate ? p.createdAt.toDate().toISOString().substr(0, 10) : '');
                const dateB = p.updatedAt && typeof p.updatedAt === 'string' ? p.updatedAt.substr(0, 10) : (p.updatedAt?.toDate ? p.updatedAt.toDate().toISOString().substr(0, 10) : '');
                return dateA === labelDate || dateB === labelDate;
            });
        }

        // Filter by Search Term (Name or Barcode)
        if (labelSearchTerm) {
            const query = labelSearchTerm.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.barcode && p.barcode.toLowerCase().includes(query))
            );
        }

        setProductsToLabel(filtered);
        // Default: Select ALL on load/filter change
        setSelectedIds(new Set(filtered.map(p => p.id)));

    }, [showLabelModal, labelDate, labelSearchTerm, products]);

    const toggleSelectAll = () => {
        if (selectedIds.size === productsToLabel.length) {
            setSelectedIds(new Set()); // Deselect all
        } else {
            setSelectedIds(new Set(productsToLabel.map(p => p.id))); // Select all
        }
    };

    const toggleSelection = (id) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handlePrintLabels = () => {
        if (selectedIds.size === 0) {
            alert('Selecione pelo menos um produto para imprimir.');
            return;
        }

        const template = LABEL_TEMPLATES[selectedTemplate];
        const printWindow = window.open('', '_blank', 'width=800,height=1000');

        // Build final list based on selection and quantity rules
        const finalItems = [];
        productsToLabel.forEach(p => {
            if (selectedIds.has(p.id)) {
                // Determine quantity for this item
                const count = qtyMode === 'STOCK' ? (p.stock > 0 ? p.stock : 1) : 1;
                for (let i = 0; i < count; i++) {
                    finalItems.push(p);
                }
            }
        });

        const labelsHtml = finalItems.map(product => {
            // Generate Real Barcode Image
            const canvas = document.createElement('canvas');
            try {
                JsBarcode(canvas, product.barcode || product.id.substr(0, 8), {
                    format: "CODE128",
                    displayValue: true,
                    fontSize: 10,
                    margin: 0,
                    height: 30,
                    width: 1.5
                });
            } catch (e) {
                console.error("Barcode generation failed", e);
            }
            const barcodeDataUrl = canvas.toDataURL("image/png");

            return `
            <div class="label">
                <div class="barcode-container">
                    <div class="price">R$ ${parseFloat(product.price).toFixed(2).replace('.', ',')}</div>
                    <div class="name">${product.name.substring(0, 25)}</div>
                    <div class="code-wrapper">
                        <img src="${barcodeDataUrl}" style="max-width: 90%; height: auto;" />
                    </div>
                </div>
            </div>
            `;
        }).join('');

        const style = `
            <style>
                @page { size: A4; margin: 10mm; }
                body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
                .sheet {
                    display: grid;
                    grid-template-columns: repeat(${template.cols}, 1fr);
                    grid-auto-rows: ${template.height};
                    gap: 0 ${template.marginX};
                    width: 100%;
                }
                .label {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px dashed #ddd;
                    box-sizing: border-box;
                    padding: 2px;
                    overflow: hidden;
                    text-align: center;
                    page-break-inside: avoid;
                }
                .price { font-size: 14px; font-weight: bold; }
                .name { font-size: 10px; margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .code-wrapper { display: flex; justify-content: center; margin-top: 2px; }

                @media print {
                    .label { border: none; }
                }
            </style>
        `;

        printWindow.document.write(`
            <html>
                <head><title>Etiquetas - ${template.name}</title>${style}</head>
                <body>
                    <div class="sheet">
                        ${labelsHtml}
                    </div>
                     <script>
                        // window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm)
    );

    // === RENDER ===
    if (!authorizedUser) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white relative">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-10" />
                <PinModal
                    isOpen={showPinModal}
                    onClose={() => navigate('/dashboard')}
                    title="Acesso Restrito: Cadastro de Produtos"
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
                    <h1 className="text-xl md:text-[1.8rem] font-bold" style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
                        <FaBoxOpen className="mr-1" style={{ color: 'var(--primary)' }} /> Cadastro de Produtos
                    </h1>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <button className="btn btn-secondary flex-1 md:flex-none py-2 px-3 text-xs md:text-sm border-dashed" onClick={() => setShowLabelModal(true)}>
                            <FaBarcode /> Etiquetas
                        </button>
                        <button className="btn btn-secondary flex-1 md:flex-none py-2 px-3 text-xs md:text-sm" onClick={() => setShowNfeModal(true)}>
                            <FaFileInvoiceDollar /> Importar NFe
                        </button>
                        <button className="btn btn-primary flex-1 md:flex-none py-2 px-3 text-xs md:text-sm font-bold" onClick={() => setShowForm(true)}>
                            <FaPlus /> Novo Produto (F2)
                        </button>
                    </div>
                </div>

                {/* LABEL MODAL - REFACTORED FOR SELECTION */}
                {showLabelModal && (
                    <div className="modal-overlay">
                        <div className="modal-content p-6 max-w-4xl w-full bg-[#111] border border-gray-800 text-white rounded-xl shadow-2xl flex flex-col" style={{ height: '90vh' }}>
                            <div className="flex-between mb-4 border-b border-gray-800 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <FaBarcode className="text-primary" /> Gerador de Etiquetas
                                    </h2>
                                    <p className="text-sm text-gray-500">Selecione os produtos e o formato de impressão</p>
                                </div>
                                <button className="text-gray-400 hover:text-white" onClick={() => setShowLabelModal(false)}>
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            <div className="flex gap-6 flex-1 overflow-hidden">
                                {/* Left: Settings */}
                                <div className="w-1/3 flex flex-col gap-4 overflow-auto pr-2">
                                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                                        <label className="text-sm font-bold text-primary mb-2 block uppercase">1. Filtros</label>
                                        <div className="mb-4">
                                            <span className="text-xs text-gray-400">Pesquisar Produto</span>
                                            <div className="relative mt-1">
                                                <FaSearch className="absolute left-3 top-3 text-gray-600" />
                                                <input
                                                    type="text"
                                                    className="input-premium w-full text-sm pl-9"
                                                    placeholder="Nome ou Código..."
                                                    value={labelSearchTerm}
                                                    onChange={(e) => setLabelSearchTerm(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="mb-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-xs text-gray-400">Data de Cadastro</span>
                                                <button
                                                    className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 rounded hover:bg-primary/20"
                                                    onClick={() => setLabelDate(new Date().toISOString().split('T')[0])}
                                                >
                                                    HOJE
                                                </button>
                                            </div>
                                            <input
                                                type="date"
                                                className="input-premium w-full text-sm"
                                                value={labelDate}
                                                onChange={(e) => setLabelDate(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                                        <label className="text-sm font-bold text-primary mb-2 block uppercase">2. Modelo</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {Object.entries(LABEL_TEMPLATES).map(([key, tpl]) => (
                                                <button
                                                    key={key}
                                                    className={`p-2 text-xs border rounded transition-all text-left flex justify-between
                                                        ${selectedTemplate === key
                                                            ? 'border-primary bg-primary/20 text-white font-bold'
                                                            : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'}
                                                    `}
                                                    onClick={() => setSelectedTemplate(key)}
                                                >
                                                    <span>{tpl.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                                        <label className="text-sm font-bold text-primary mb-2 block uppercase">3. Quantidade</label>
                                        <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="qty"
                                                    checked={qtyMode === 'SINGLE'}
                                                    onChange={() => setQtyMode('SINGLE')}
                                                />
                                                <span className="text-sm">1 Etiqueta por Produto</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="qty"
                                                    checked={qtyMode === 'STOCK'}
                                                    onChange={() => setQtyMode('STOCK')}
                                                />
                                                <span className="text-sm">Imprimir Estoque Atual</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Product List */}
                                <div className="w-2/3 flex flex-col bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                                    <div className="p-3 bg-gray-800 flex-between border-b border-gray-700">
                                        <span className="font-bold text-sm">Produtos ({productsToLabel.length})</span>
                                        <div className="flex gap-2">
                                            <button className="text-xs text-primary hover:underline" onClick={toggleSelectAll}>
                                                {selectedIds.size === productsToLabel.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-auto p-2">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="text-xs text-gray-500 border-b border-gray-700 sticky top-0 bg-gray-900">
                                                <tr>
                                                    <th className="p-2 w-8">#</th>
                                                    <th className="p-2">Produto</th>
                                                    <th className="p-2 w-20">Estoque</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productsToLabel.map(p => (
                                                    <tr key={p.id} className="border-b border-gray-800 hover:bg-white/5 text-sm">
                                                        <td className="p-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(p.id)}
                                                                onChange={() => toggleSelection(p.id)}
                                                                className="cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="p-2">
                                                            <div className="font-medium">{p.name}</div>
                                                            <div className="text-xs text-gray-500">{p.barcode || '-'}</div>
                                                        </td>
                                                        <td className="p-2 text-gray-400">
                                                            {qtyMode === 'STOCK' ? (
                                                                <span className="text-white font-bold">{p.stock}x</span>
                                                            ) : (
                                                                <span>1x</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {productsToLabel.length === 0 && (
                                                    <tr>
                                                        <td colSpan="3" className="p-8 text-center text-gray-500">
                                                            Nenhum produto encontrado nesta data.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="p-3 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                                        <span className="text-sm text-gray-400">
                                            {selectedIds.size} selecionados
                                        </span>
                                        <button
                                            className="btn btn-primary py-2 px-6 font-bold shadow-lg"
                                            onClick={handlePrintLabels}
                                            disabled={selectedIds.size === 0}
                                        >
                                            <FaPrint className="mr-2" /> IMPRIMIR AGORA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search Bar */}
                <div className="card mb-6 p-4 flex items-center gap-4 bg-[#0a0a0a] border-gray-800 shadow-xl">
                    <FaSearch className="text-primary text-xl" />
                    <input
                        className="w-full bg-transparent border-none text-white text-lg outline-none placeholder-gray-600"
                        placeholder="Pesquisar por Nome ou Código do Produto..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Product Grid Layout */}
                <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
                    {/* Desktop Table View */}
                    <table className="hidden lg:table w-full text-left">
                        <thead className="bg-[#111] text-gray-500 text-[10px] md:text-xs uppercase font-black border-b border-gray-800/50">
                            <tr>
                                <th className="p-4 lg:p-6">Identificação / Categoria</th>
                                <th className="p-4 lg:p-6">Código</th>
                                <th className="p-4 lg:p-6 text-center">Nível Estoque</th>
                                <th className="p-4 lg:p-6 text-right">Preço Venda</th>
                                <th className="p-4 lg:p-6 text-right text-gray-600 italic">Custo Unit.</th>
                                <th className="p-4 lg:p-6 text-right">Margem / Lucro</th>
                                <th className="p-4 lg:p-6 text-right">Opções</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/30">
                            {filteredProducts.map(product => (
                                <tr key={product.id} className="hover:bg-white/[0.02] transition-colors group border-b border-gray-800/10">
                                    <td className="p-4 lg:p-6">
                                        <div className="font-black text-white text-base lg:text-lg group-hover:text-primary transition-colors leading-none">{product.name}</div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1 opacity-60">
                                            {CATEGORIES[product.category] || product.category}
                                        </div>
                                    </td>
                                    <td className="p-4 lg:p-6 font-mono text-gray-400 text-sm">{product.barcode || '-'}</td>
                                    <td className="p-4 lg:p-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${product.stock <= (product.minStock || 5) ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}`}>
                                            {product.stock} {product.unit}
                                        </span>
                                    </td>
                                    <td className="p-4 lg:p-6 text-right text-xl font-black text-white group-hover:text-green-400 transition-all font-mono">
                                        {formatCurrency(product.price)}
                                    </td>
                                    <td className="p-4 lg:p-6 text-right text-gray-600 font-mono text-xs italic opacity-50">
                                        {formatCurrency(product.costPrice || 0)}
                                    </td>
                                    <td className="p-4 lg:p-6 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs font-black text-green-500 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                                                +{product.markup}%
                                            </span>
                                            <span className="text-[10px] text-gray-500 mt-1">
                                                Lucro: {formatCurrency(product.price - (product.costPrice || 0))}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 lg:p-6">
                                        <div className="flex justify-end gap-2">
                                            <button className="p-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-white hover:text-black transition-all border border-gray-700 shadow-lg group" onClick={() => handleEdit(product)} title="Editar">
                                                <FaEdit className="group-hover:scale-110 transition-transform" />
                                            </button>
                                            <button className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-black transition-all border border-red-500/20 shadow-lg shadow-red-500/5 group" onClick={() => handleDelete(product.id)} title="Excluir">
                                                <FaTrash className="group-hover:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile & Tablet Card View */}
                    <div className="lg:hidden divide-y divide-gray-800/30">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="p-5 hover:bg-white/[0.01] transition-colors">
                                <div className="flex justify-between items-start mb-4 gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-white text-base truncate leading-tight uppercase">{product.name}</h3>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                                            {CATEGORIES[product.category] || product.category} • {product.barcode || 'S/ Código'}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-lg font-black text-white font-mono leading-none">{formatCurrency(product.price)}</p>
                                        <span className="text-[9px] font-black text-green-500 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 mt-1 inline-block">+{product.markup}%</span>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center bg-[#050505] p-4 rounded-2xl border border-gray-800/50">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest">Estoque Disponível</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-3 py-1 rounded-full text-[11px] font-black tracking-widest border ${product.stock <= (product.minStock || 5) ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-green-500/10 text-green-500 border-green-500/30'}`}>
                                                {product.stock} <small className="opacity-60">{product.unit}</small>
                                            </span>
                                            {product.stock <= (product.minStock || 5) && (
                                                <FaExclamationTriangle className="text-red-500 animate-pulse" size={14} />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button className="p-3 bg-gray-900 border border-gray-800 rounded-2xl text-gray-300 active:scale-95 transition-all" onClick={() => handleEdit(product)}>
                                            <FaEdit size={16} />
                                        </button>
                                        <button className="p-3 bg-red-900/10 border border-red-900/30 text-red-500 rounded-2xl active:scale-95" onClick={() => handleDelete(product.id)}>
                                            <FaTrash size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div className="p-24 text-center text-gray-700">
                            <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800 shadow-xl">
                                <FaBoxOpen size={40} className="text-gray-800" />
                            </div>
                            <p className="font-black uppercase text-xs tracking-[0.3em] opacity-40">Nenhum produto cadastrado</p>
                        </div>
                    )}
                </div>

                <NfeImportModal
                    isOpen={showNfeModal}
                    onClose={() => setShowNfeModal(false)}
                    onImport={handleNfeImport}
                    currentProducts={products}
                />
            </div>
        );
    }

    // === PRODUCT FORM (Professional Layout) ===
    return (
        <div className="container-center" style={{ padding: '1rem', maxWidth: '1000px' }}>
            <div className="modal-premium p-4 md:p-6 bg-[#050505] border border-gray-800/50 rounded-2xl shadow-3xl">
                {/* Header Options */}
                <div className="flex-between mb-6 pb-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">{editingProduct ? 'Alterar Produto' : 'Novo Produto'}</h2>
                    <div className="flex gap-2">
                        <button className="btn btn-success py-2 md:px-6 font-bold" onClick={handleSubmit}>
                            <FaSave /> <span className="hidden sm:inline">Gravar (F10)</span><span className="sm:hidden">Gravar</span>
                        </button>
                        <button className="btn btn-secondary py-2 px-4" onClick={resetForm}>
                            <FaTimes /> <span className="hidden sm:inline">Fechar</span>
                        </button>
                    </div>
                </div>

                {/* Main Form Area */}
                <div className="bg-[#111] p-4 md:p-6 rounded-xl border border-gray-800/50">
                    <form id="productForm" onSubmit={handleSubmit} className="space-y-6">

                        {/* Row 1: Barcode & Name */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-1">
                                <label className="input-label-premium">Código (F1)</label>
                                <div className="flex gap-1">
                                    <input name="barcode" value={formData.barcode} onChange={handleChange} className="input-premium py-3" placeholder="Automático" />
                                    <button type="button" onClick={handleGenerateBarcode} className="btn btn-primary px-3 bg-primary/10 text-primary border-primary/20" title="Gerar Código"><FaBarcode /></button>
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <label className="input-label-premium">Descrição do Produto *</label>
                                <input name="name" value={formData.name} onChange={handleChange} className="input-premium py-3 text-white uppercase font-bold" required autoFocus placeholder="NOME DO PRODUTO" />
                            </div>
                        </div>

                        {/* Row 2: Category, Unit, Location */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="input-label-premium">Grupo / Categoria</label>
                                <select name="category" value={formData.category} onChange={handleChange} className="input-premium py-3">
                                    {Object.entries(CATEGORIES).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="input-label-premium">Unidade</label>
                                <select name="unit" value={formData.unit} onChange={handleChange} className="input-premium py-3">
                                    <option value="UN">UN</option>
                                    <option value="KG">KG</option>
                                    <option value="MT">MT</option>
                                    <option value="CX">CX</option>
                                    <option value="KIT">KIT</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label-premium">Localização</label>
                                <input name="location" value={formData.location} onChange={handleChange} className="input-premium py-3" placeholder="Ex: Prateleira B1" />
                            </div>
                        </div>

                        <div className="border-t border-gray-800/50 pt-6">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Precificação & Estoque</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-black/40 p-4 md:p-6 rounded-2xl border border-gray-800">
                                <div>
                                    <label className="input-label-premium text-gray-400">Preço Custo (R$)</label>
                                    <input type="number" name="costPrice" value={formData.costPrice} onChange={handleChange} className="input-premium py-3 border-gray-800" placeholder="0,00" />
                                </div>

                                <div>
                                    <label className="input-label-premium text-orange-500">Margem (%)</label>
                                    <input type="number" name="markup" value={formData.markup} onChange={handleChange} className="input-premium py-3 border-orange-500/20 text-orange-400" placeholder="0%" />
                                </div>

                                <div>
                                    <label className="input-label-premium text-blue-400 font-bold">Lucro Líquido</label>
                                    <div className="input-premium py-3 bg-blue-500/5 text-blue-400 border-blue-500/10 font-bold">
                                        {formatCurrency(calculatedProfit)}
                                    </div>
                                </div>

                                <div>
                                    <label className="input-label-premium text-primary font-bold">Preço Venda (R$)</label>
                                    <input type="number" name="price" value={formData.price} onChange={handleChange} className="input-premium py-3 border-primary/40 text-primary text-xl font-black" required />
                                </div>
                            </div>
                        </div>

                        {/* Stock Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-lg text-primary"><FaBoxOpen /></div>
                                <div className="flex-1">
                                    <label className="input-label-premium mb-0">Estoque Atual</label>
                                    <input type="number" name="stock" value={formData.stock} onChange={handleChange} className="w-full bg-transparent border-none text-2xl font-black text-white focus:outline-none" />
                                </div>
                            </div>
                            <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                                <div className="p-3 bg-red-500/10 rounded-lg text-red-500"><FaExclamationTriangle /></div>
                                <div className="flex-1">
                                    <label className="input-label-premium mb-0">Estoque Mínimo (Alerta)</label>
                                    <input type="number" name="minStock" value={formData.minStock} onChange={handleChange} className="w-full bg-transparent border-none text-2xl font-black text-white focus:outline-none" placeholder="5" />
                                </div>
                            </div>
                        </div>

                        {/* Fiscal Section (NFe/NFC-e) */}
                        <details className="mt-4 bg-gray-900 p-4 rounded-xl border border-gray-800 group" open={editingProduct && formData.ncm}>
                            <summary className="cursor-pointer font-bold text-gray-500 text-xs uppercase flex items-center justify-between group-open:text-primary transition-colors">
                                <div className="flex items-center gap-2">
                                    <FaFileInvoiceDollar /> Tributação Fiscal (Para NF-e / NFC-e)
                                </div>
                            </summary>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                                <div>
                                    <label className="input-label-premium">NCM (8 dígitos)</label>
                                    <input name="ncm" value={formData.ncm} onChange={handleChange} className="input-premium py-3" placeholder="22021000" maxLength={8} />
                                </div>
                                <div>
                                    <label className="input-label-premium">CFOP Padrão</label>
                                    <input name="cfop" value={formData.cfop} onChange={handleChange} className="input-premium py-3" placeholder="5102" maxLength={4} />
                                </div>
                                <div>
                                    <label className="input-label-premium">Origem da Mercadoria</label>
                                    <select name="origin" value={formData.origin} onChange={handleChange} className="input-premium py-3">
                                        <option value="0">0 - Nacional</option>
                                        <option value="1">1 - Importada</option>
                                        <option value="2">2 - Estrangeira (Adq. Interno)</option>
                                    </select>
                                </div>
                            </div>
                        </details>

                    </form>
                </div>
                {/* Tutorial */}
                <TutorialModal
                    isOpen={showTutorial}
                    onClose={closeTutorial}
                    title="Tutorial: Produtos"
                    steps={tutorialSteps}
                    currentStep={currentStep}
                    onNext={() => setCurrentStep(prev => prev + 1)}
                    onPrev={() => setCurrentStep(prev => prev - 1)}
                />
            </div>
        </div>
    );
};

export default Products;
