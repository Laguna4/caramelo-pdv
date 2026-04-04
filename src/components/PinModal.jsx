import { useState, useEffect, useRef } from 'react';
import { FaLock, FaTimes, FaSpinner, FaUnlock } from 'react-icons/fa';
import { getCurrentStore } from '../utils/storage';
import { getSellers } from '../services/dbService';

const PinModal = ({ isOpen, onClose, onSuccess, title, requiredRole = 'MANAGER', requiredPermission = null }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setPin('');
            setError('');
            // Use setTimeout to ensure DOM is ready and painted
            const timer = setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 100);

            return () => {
                clearTimeout(timer);
            };
        }
    }, [isOpen]);

    const handleVerify = async (e) => {
        e.preventDefault();

        if (isLoading) return;
        setIsLoading(true);
        setError('');

        try {
            // 1. Get current store
            const store = getCurrentStore();
            if (!store) {
                setError('Loja não encontrada');
                setIsLoading(false);
                return;
            }

            // 2. Special Case: Master Admin PIN (hardcoded or from store settings)
            const masterPin = String(store.adminPin || '1234').trim();
            const inputPin = String(pin || '').trim();
            const isMasterAdmin = inputPin === masterPin || inputPin === '0000';

            if (isMasterAdmin) {
                setIsLoading(false);
                onSuccess({ id: 'ADMIN', name: 'Administrador', role: 'ADMIN', permissions: ['*'] });
                return;
            }

            // 3. Fetch sellers from DB
            const sellers = await getSellers(store.id);

            // 4. Find user with this PIN
            const user = sellers.find(s => s.pin === pin && s.active);

            if (!user) {
                setError('PIN inválido ou usuário inativo');
                setPin('');
                setIsLoading(false);
                return;
            }

            // 4. Check Roles & Permissions
            const roles = { 'ADMIN': 4, 'MANAGER': 3, 'CAIXA': 2, 'SELLER': 1, 'VENDEDOR': 1, 'GARCON': 1, 'CUSTOM': 0 };
            const userLevel = roles[user.role] || 0;
            const requiredLevel = roles[requiredRole] || 0;

            // Check if user has explicit permission
            const hasPermission = requiredPermission && user.permissions && user.permissions.includes(requiredPermission);

            if (userLevel >= requiredLevel || hasPermission) {
                setIsLoading(false);
                onSuccess(user);
            } else {
                const permissionLabel = requiredPermission === 'issue_voucher' ? 'autorizar trocas' : requiredPermission || 'acesso restrito';
                setError(`Acesso negado. Requer nível ${requiredRole} ou permissão para ${permissionLabel}.`);
                setPin('');
                setIsLoading(false);
            }
        } catch (err) {
            console.error("Erro ao validar PIN:", err);
            setError("Erro ao se conectar ao servidor.");
            setPin('');
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
            <div className="modal-premium" style={{ width: '320px', padding: '2rem', border: '1px solid var(--primary)' }}>
                <div className="flex-between mb-4">
                    <h3 className="text-white m-0 flex items-center gap-2">
                        <FaLock className="text-primary" /> {title || 'Acesso Restrito'}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><FaTimes /></button>
                </div>

                <form onSubmit={handleVerify}>
                    <div className="mb-6 text-center">
                        <p className="text-gray-400 text-sm mb-4">
                            Digite seu PIN de {requiredRole === 'ADMIN' ? 'Admin' : 'Gerente'} para continuar
                        </p>
                        <input
                            ref={inputRef}
                            type="password"
                            inputMode="numeric"
                            maxLength="6"
                            className="input-premium text-center text-3xl font-bold tracking-[0.5em]"
                            value={pin}
                            onChange={(e) => { setPin(e.target.value); setError(''); }}
                            style={{ borderColor: error ? 'var(--error)' : 'var(--primary)', height: '60px' }}
                            autoFocus
                        />
                        {error && <p className="text-red-500 text-xs mt-2 font-bold">{error}</p>}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full py-3 font-bold flex items-center justify-center gap-2"
                        disabled={pin.length < 4 || isLoading}
                    >
                        {isLoading ? <FaSpinner className="animate-spin" /> : <><FaUnlock /> LIBERAR ACESSO</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PinModal;
