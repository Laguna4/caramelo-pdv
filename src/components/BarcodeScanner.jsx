import { useState, useEffect, useRef } from 'react';
import { FaBarcode, FaCamera, FaKeyboard } from 'react-icons/fa';
import { isValidBarcode } from '../utils/calculations';

const BarcodeScanner = ({ onScan, disabled }) => {
    const [scanMode, setScanMode] = useState('usb'); // 'usb', 'camera', 'manual'
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    // USB Scanner listener
    useEffect(() => {
        if (scanMode !== 'usb' || disabled) return;

        let barcode = '';
        let timeout;

        const handleKeyPress = (e) => {
            // Prevent default if it's a barcode scanner input
            if (e.key === 'Enter' && barcode) {
                e.preventDefault();
                handleScan(barcode);
                barcode = '';
            } else if (e.key.length === 1) {
                barcode += e.key;
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    barcode = '';
                }, 100);
            }
        };

        window.addEventListener('keypress', handleKeyPress);
        return () => {
            window.removeEventListener('keypress', handleKeyPress);
            clearTimeout(timeout);
        };
    }, [scanMode, disabled]);

    const handleScan = (code) => {
        if (!isValidBarcode(code)) {
            setError('Código de barras inválido');
            return;
        }
        setError('');
        onScan(code);
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualCode.trim()) {
            handleScan(manualCode.trim());
            setManualCode('');
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">
                    <FaBarcode /> Scanner de Código de Barras
                </h3>
            </div>

            {/* Mode Selector */}
            <div className="flex mb-2" style={{ gap: '0.5rem' }}>
                <button
                    className={`btn ${scanMode === 'usb' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setScanMode('usb')}
                    disabled={disabled}
                >
                    <FaBarcode /> Leitor USB
                </button>
                <button
                    className={`btn ${scanMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setScanMode('manual')}
                    disabled={disabled}
                >
                    <FaKeyboard /> Manual
                </button>
            </div>

            {/* USB Mode */}
            {scanMode === 'usb' && (
                <div className="text-center p-3" style={{
                    background: 'var(--primary-50)',
                    borderRadius: 'var(--radius-md)',
                    border: '2px dashed var(--primary-300)'
                }}>
                    <FaBarcode size={48} color="var(--primary-600)" className="mb-2" />
                    <p className="text-muted">
                        {disabled ? 'Scanner desabilitado' : 'Aguardando leitura do código de barras...'}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--gray-500)' }}>
                        Aponte o leitor para o código de barras
                    </p>
                </div>
            )}

            {/* Manual Mode */}
            {scanMode === 'manual' && (
                <form onSubmit={handleManualSubmit}>
                    <div className="input-group">
                        <label className="input-label">Digite o código de barras</label>
                        <input
                            ref={inputRef}
                            type="text"
                            className={`input ${error ? 'input-error' : ''}`}
                            value={manualCode}
                            onChange={(e) => {
                                setManualCode(e.target.value);
                                setError('');
                            }}
                            placeholder="Ex: 7891234567890"
                            disabled={disabled}
                            autoFocus
                        />
                        {error && <p className="error-message">{error}</p>}
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={disabled || !manualCode.trim()}>
                        Adicionar Produto
                    </button>
                </form>
            )}
        </div>
    );
};

export default BarcodeScanner;
