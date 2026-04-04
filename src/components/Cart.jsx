import { FaTrash, FaMinus, FaPlus, FaShoppingCart } from 'react-icons/fa';
import { formatCurrency, calculateCartTotal } from '../utils/calculations';

const Cart = ({ items, onUpdateQuantity, onRemoveItem, onClear, onCheckout }) => {
    const total = calculateCartTotal(items);

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">
                    <FaShoppingCart /> Carrinho de Compras
                </h3>
                {items.length > 0 && (
                    <button className="btn btn-sm btn-secondary" onClick={onClear}>
                        Limpar
                    </button>
                )}
            </div>

            {items.length === 0 ? (
                <div className="text-center p-3 text-muted">
                    <FaShoppingCart size={48} color="var(--gray-300)" className="mb-2" />
                    <p>Carrinho vazio</p>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>
                        Escaneie ou adicione produtos para começar
                    </p>
                </div>
            ) : (
                <>
                    {/* Cart Items */}
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex-between p-2"
                                style={{
                                    borderBottom: '1px solid var(--gray-100)',
                                    gap: 'var(--spacing-md)'
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                        {item.name}
                                    </p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                                        {formatCurrency(item.price)} × {item.quantity}
                                    </p>
                                </div>

                                {/* Quantity Controls */}
                                <div className="flex" style={{ alignItems: 'center', gap: '0.5rem' }}>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                    >
                                        <FaMinus size={12} />
                                    </button>
                                    <span style={{
                                        minWidth: '2rem',
                                        textAlign: 'center',
                                        fontWeight: 600
                                    }}>
                                        {item.quantity}
                                    </span>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                                        disabled={item.quantity >= item.stock}
                                    >
                                        <FaPlus size={12} />
                                    </button>
                                </div>

                                {/* Item Total */}
                                <div style={{
                                    minWidth: '80px',
                                    textAlign: 'right',
                                    fontWeight: 600
                                }}>
                                    {formatCurrency(item.price * item.quantity)}
                                </div>

                                {/* Remove Button */}
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => onRemoveItem(item.id)}
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div
                        className="p-2 mt-2"
                        style={{
                            borderTop: '2px solid var(--gray-200)',
                            background: 'var(--gray-50)'
                        }}
                    >
                        <div className="flex-between mb-2">
                            <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
                                Total:
                            </span>
                            <span style={{
                                fontSize: 'var(--font-size-2xl)',
                                fontWeight: 700,
                                color: 'var(--primary-600)'
                            }}>
                                {formatCurrency(total)}
                            </span>
                        </div>

                        <button
                            className="btn btn-success btn-lg"
                            style={{ width: '100%' }}
                            onClick={onCheckout}
                        >
                            Finalizar Venda
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default Cart;
