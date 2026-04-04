import React, { useState, useRef } from 'react';
import { FaUpload, FaTimes, FaCheck, FaExclamationTriangle, FaFileImport } from 'react-icons/fa';
import { parseNFeXML } from '../services/nfeService';
import { formatCurrency } from '../utils/calculations';

const NfeImportModal = ({ isOpen, onClose, onImport, currentProducts = [] }) => {
    const [step, setStep] = useState(1); // 1: Upload, 2: Preview/Map
    const [supplier, setSupplier] = useState(null);
    const [items, setItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const xmlString = event.target.result;
                const { items: parsedItems, supplier: parsedSupplier } = parseNFeXML(xmlString);

                setItems(parsedItems.map(item => {
                    // Try to match with existing products by barcode
                    const existing = currentProducts.find(p => p.barcode === item.barcode && item.barcode !== "");
                    return { ...item, existingProduct: existing, shouldAdd: !existing };
                }));

                setSupplier(parsedSupplier);
                setSelectedItems(new Set(parsedItems.map(it => it.tempId)));
                setStep(2);
                setError(null);
            } catch (err) {
                setError(err.message || "Erro ao processar XML");
            }
        };
        reader.readAsText(file);
    };

    const toggleItem = (tempId) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(tempId)) newSet.delete(tempId);
        else newSet.add(tempId);
        setSelectedItems(newSet);
    };

    const handleFinalImport = () => {
        const itemsToImport = items.filter(it => selectedItems.has(it.tempId));
        onImport(itemsToImport);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative max-w-5xl w-full bg-[#111] border border-gray-800 text-white rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>
                <div className="flex justify-between items-center p-6 border-b border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-caramelo-primary">
                            <FaFileImport /> Importação de NFe
                        </h2>
                        <p className="text-sm text-gray-500">Cadastre produtos e atualize estoque via XML</p>
                    </div>
                    <button className="text-gray-400 hover:text-white" onClick={onClose}>
                        <FaTimes size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-auto">
                    {step === 1 ? (
                        <div
                            className="border-2 border-dashed border-gray-800 rounded-2xl p-12 text-center hover:border-caramelo-primary/50 hover:bg-caramelo-primary/5 transition-all cursor-pointer"
                            onClick={() => fileInputRef.current.click()}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xml" className="hidden" />
                            <FaUpload size={48} className="mx-auto mb-4 text-gray-600" />
                            <h3 className="text-xl font-bold mb-2">Selecione o arquivo XML da Nota Fiscal</h3>
                            <p className="text-gray-500 mb-6 text-sm">Arraste e solte o arquivo aqui ou clique para buscar</p>

                            {error && (
                                <div className="bg-red-900/20 text-red-500 p-4 rounded-lg flex items-center gap-3 justify-center mb-4 border border-red-900/50">
                                    <FaExclamationTriangle /> {error}
                                </div>
                            )}

                            <div className="text-xs text-gray-600 mt-8">
                                <p>Aceitamos apenas arquivos .xml padrão SEFAZ</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {/* Supplier Header */}
                            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-800 mb-6 flex justify-between items-center">
                                <div>
                                    <span className="text-xs text-gray-500 uppercase font-black">Fornecedor</span>
                                    <h4 className="font-bold text-lg">{supplier?.name}</h4>
                                    <p className="text-xs text-gray-400">CNPJ: {supplier?.cnpj}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-gray-500 uppercase font-black">Resumo da Nota</span>
                                    <div className="text-lg font-bold text-caramelo-primary">{items.length} Itens</div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="bg-black/40 rounded-xl border border-gray-800 overflow-hidden">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead className="bg-gray-900/80 text-gray-400 uppercase text-[10px] font-black tracking-widest border-b border-gray-800">
                                        <tr>
                                            <th className="p-4 w-12 text-center">#</th>
                                            <th className="p-4">Produto na Nota</th>
                                            <th className="p-4 text-center">Qtd</th>
                                            <th className="p-4 text-right">Custo Un.</th>
                                            <th className="p-4 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.tempId} className="border-b border-gray-800 hover:bg-white/5 transition-colors">
                                                <td className="p-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedItems.has(item.tempId)}
                                                        onChange={() => toggleItem(item.tempId)}
                                                        className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-caramelo-primary"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-white uppercase truncate max-w-sm">{item.name}</div>
                                                    <div className="text-[10px] text-gray-500 font-mono mt-1">
                                                        EAN: {item.barcode || 'SEM EAN'} • NCM: {item.ncm}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center font-bold">{item.quantity} {item.unit}</td>
                                                <td className="p-4 text-right text-gray-300">{formatCurrency(item.costPrice)}</td>
                                                <td className="p-4 text-right">
                                                    {item.existingProduct ? (
                                                        <span className="text-[10px] bg-yellow-900/30 text-yellow-500 px-2 py-1 rounded-full border border-yellow-900/50">
                                                            ATUALIZAR ESTOQUE
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] bg-green-900/30 text-green-500 px-2 py-1 rounded-full border border-green-900/50">
                                                            NOVO PRODUTO
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-800 flex justify-between items-center bg-black/40">
                    {step === 2 && (
                        <>
                            <div className="text-sm text-gray-500">
                                <span className="text-white font-bold">{selectedItems.size}</span> itens selecionados para importar
                            </div>
                            <div className="flex gap-3">
                                <button className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-lg transition-all" onClick={() => setStep(1)}>
                                    Voltar
                                </button>
                                <button className="px-8 py-2 bg-caramelo-primary hover:bg-caramelo-secondary text-white font-bold rounded-lg transition-all flex items-center gap-2" onClick={handleFinalImport}>
                                    <FaCheck /> Confirmar Importação
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NfeImportModal;
