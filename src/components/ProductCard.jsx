import { FaBox, FaTag } from 'react-icons/fa';
import { formatCurrency } from '../utils/calculations';
import { CATEGORIES } from '../config';

const ProductCard = ({ product, onAdd, compact = false }) => {
    const isLowStock = product.stock < 10;

    if (compact) {
        return (
            <div
                className="card"
                style={{
                    padding: 'var(--spacing-sm)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-base)'
                }}
                onClick={() => onAdd(product)}
            >
                <div className="flex-between">
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                            {product.name}
                        </p>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                            {formatCurrency(product.price)}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className={`badge ${isLowStock ? 'badge-warning' : 'badge-success'}`}>
                            {product.stock} un.
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card" style={{ height: '100%' }}>
            {/* Product Image Placeholder */}
            <div
                style={{
                    height: '150px',
                    background: 'linear-gradient(135deg, var(--primary-100), var(--primary-200))',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <FaBox size={48} color="var(--primary-400)" />
            </div>

            {/* Product Info */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>{product.name}</h4>

                <div className="flex" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className="badge badge-primary">
                        <FaTag size={10} /> {CATEGORIES[product.category] || product.category}
                    </span>
                    <span className={`badge ${isLowStock ? 'badge-warning' : 'badge-success'}`}>
                        {product.stock} em estoque
                    </span>
                </div>

                {product.barcode && (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                        Código: {product.barcode}
                    </p>
                )}
            </div>

            {/* Price and Action */}
            <div className="flex-between" style={{ marginTop: 'auto' }}>
                <span style={{
                    fontSize: 'var(--font-size-2xl)',
                    fontWeight: 700,
                    color: 'var(--primary-600)'
                }}>
                    {formatCurrency(product.price)}
                </span>
                <button
                    className="btn btn-primary"
                    onClick={() => onAdd(product)}
                    disabled={product.stock === 0}
                >
                    {product.stock === 0 ? 'Sem Estoque' : 'Adicionar'}
                </button>
            </div>
        </div>
    );
};

export default ProductCard;
