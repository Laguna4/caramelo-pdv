import { useState } from 'react';
import { FaStore, FaLock, FaEnvelope } from 'react-icons/fa';
import { generateId } from '../utils/calculations';
import { setCurrentStore, setCurrentUser } from '../utils/storage';
import { login, register } from '../services/authService';
import { createStore, getStore } from '../services/dbService';
import { SUBSCRIPTION_STATUS } from '../config';

const Login = ({ onLogin }) => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.email || !formData.password) {
            setError('Preencha email e senha');
            return;
        }

        const getFriendlyError = (errorMsg) => {
            if (errorMsg.includes('auth/invalid-credential') || errorMsg.includes('auth/wrong-password')) {
                return 'Senha incorreta. Verifique e tente novamente.';
            }
            if (errorMsg.includes('auth/user-not-found')) {
                return 'Usuário não cadastrado.';
            }
            if (errorMsg.includes('auth/invalid-email')) {
                return 'E-mail inválido.';
            }
            if (errorMsg.includes('auth/too-many-requests')) {
                return 'Muitas tentativas falhas. Tente novamente mais tarde.';
            }
            if (errorMsg.includes('auth/network-request-failed')) {
                return 'Erro de conexão. Verifique sua internet.';
            }
            return errorMsg;
        };

        // Login with Auth
        console.log('Tentando login com:', formData.email);
        let authResult = await login(formData.email, formData.password);
        console.log('Resultado do login:', authResult);

        // Se falhar e for o email admin, tentar criar conta apenas se o erro for "usuário não encontrado"
        if (!authResult.success && formData.email === 'lucasluob@gmail.com') {
            const isUserNotFound = authResult.error.includes('auth/user-not-found') ||
                authResult.error.includes('auth/invalid-credential'); // Firebase v9 sometimes uses this for both

            // We attempt register ONLY if login failed and it's our master admin
            // But we should be careful: if the error is "wrong-password", we shouldn't register.
            // Since "invalid-credential" is ambiguous in newer Firebase versions, we can check if error is specifically user-not-found
            // or we can try register only if we are VERY sure.

            // To be safe, if login fails for admin, we try to login first. 
            // If it continues to fail with a clear "wrong password" kind of error, we don't register.

            // Checking for specific string in message as well
            if (authResult.error.includes('auth/user-not-found') || authResult.error.includes('user not found')) {
                console.log('Admin não existe. Criando conta administrativamente...');
                const registerResult = await register(formData.email, formData.password);

                if (registerResult.success) {
                    authResult = await login(formData.email, formData.password);
                } else if (!registerResult.error.includes('auth/email-already-in-use')) {
                    // If it's not email-already-in-use, show the registration error
                    setError('Erro ao provisionar admin: ' + getFriendlyError(registerResult.error));
                    return;
                }
            }
        }

        if (!authResult.success) {
            setError(getFriendlyError(authResult.error));
            return;
        }

        const user = authResult.user;

        // Fetch Store Data from Firestore
        let storeData = await getStore(user.uid);

        // --- AUTO-RECOVERY FOR SUPER ADMIN ---
        if (!storeData && user.email === 'lucasluob@gmail.com') {
            const newStore = {
                id: user.uid,
                name: 'Caramelo Admin Master',
                ownerName: 'Lucas Oliveira',
                email: user.email,
                plan: 'PREMIUM',
                status: SUBSCRIPTION_STATUS.ACTIVE,
                subscriptionStatus: 'active',
                nextPaymentDue: new Date(new Date().setFullYear(new Date().getFullYear() + 100)).toISOString(),
                createdAt: new Date().toISOString()
            };
            await createStore(newStore);
            storeData = newStore;
            alert("👑 Acesso Super Admin restaurado com sucesso!");
        }

        if (storeData) {
            if (storeData.subscriptionStatus === 'blocked') {
                setError('Acesso BLOQUEADO. Entre em contato com o suporte.');
                return;
            }

            setCurrentStore(storeData);
            setCurrentUser({ email: storeData.email, storeId: storeData.id, uid: user.uid, role: "OWNER" });
            onLogin(storeData);
        } else {
            setError('Dados da loja não encontrados. Entre em contato com o suporte.');
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f172a, #000000)',
                padding: 'var(--spacing-lg)'
            }}
        >
            <div className="card" style={{ maxWidth: '450px', width: '100%' }}>
                {/* Logo/Header */}
                <div className="text-center mb-3">
                    <div
                        style={{
                            width: '80px',
                            height: '80px',
                            background: 'transparent',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto var(--spacing-md)',
                            // boxShadow: 'var(--shadow-lg)'
                        }}
                    >
                        <FaStore size={40} color="white" />
                    </div>
                    <h1 style={{ marginBottom: '0.5rem' }}>CarameloPDV</h1>
                    <p className="text-muted">
                        Área Restrita aos Clientes
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label-premium">Email</label>
                        <input
                            type="email"
                            name="email"
                            className="input-premium"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label-premium">Senha</label>
                        <input
                            type="password"
                            name="password"
                            className="input-premium"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div
                            className="mb-2 p-2"
                            style={{
                                background: 'var(--error-50)',
                                color: 'var(--error-700)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                        Entrar
                    </button>

                    <div className="text-center mt-4 text-xs text-gray-500">
                        <p>Não tem acesso? Fale com o Administrador</p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
