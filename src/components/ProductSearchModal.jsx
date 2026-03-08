import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaBox, FaSearch } from 'react-icons/fa';
import { formatCurrency } from '../utils/calculations';

const ProductSearchModal = ({ isOpen, onClose, results, onSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredResults, setFilteredResults] = useState(results);
    const searchInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setFilteredResults(results);
            setTimeout(() => searchInputRef.current?.focus(), 100);
        }
    }, [isOpen, results]);

    useEffect(() => {
        const query = searchTerm.toLowerCase();
        const filtered = results.filter(p =>
            p.name.toLowerCase().includes(query) ||
            (p.barcode && p.barcode.includes(query))
        );
        setFilteredResults(filtered);
    }, [searchTerm, results]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: '#0a0a0a',
                border: '1px solid #333',
                padding: '1.5rem',
                borderRadius: '16px',
                width: '700px',
                maxWidth: '95%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 0 50px rgba(0,0,0,1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaSearch className="text-orange-500" /> Consultar Produtos
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Internal Search Bar */}
                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                    <FaSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Digite o nome ou código para filtrar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            background: '#111',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            padding: '0.8rem 1rem 0.8rem 2.5rem',
                            color: 'white',
                            outline: 'none',
                            fontSize: '1rem'
                        }}
                    />
                </div>

                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }} className="custom-scrollbar">
                    {filteredResults.map((product, index) => (
                        <div
                            key={product.id}
                            onClick={() => onSelect(product)}
                            className="group"
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.75rem 1rem',
                                background: '#111',
                                border: '1px solid #222',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ color: '#444' }}>
                                    <FaBox size={24} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold', color: 'white', fontSize: '1rem' }}>{product.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#555', fontFamily: 'monospace' }}>
                                        {product.barcode || 'S/ CÓDIGO'} • {product.stock} {product.unit || 'UN'} em estoque
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold', color: '#fb923c', fontSize: '1.2rem', fontFamily: 'monospace' }}>
                                    {formatCurrency(product.price)}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredResults.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#444' }}>
                            <FaSearch size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                            <p>Nenhum produto encontrado...</p>
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #222', paddingTop: '1rem' }}>
                    <span style={{ color: '#444', fontSize: '0.8rem' }}>
                        {filteredResults.length} produtos exibidos
                    </span>
                    <p style={{ color: '#666', fontSize: '0.8rem' }}>
                        Clique no produto ou pressione ESC para fechar.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProductSearchModal;
