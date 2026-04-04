import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, updatePassword } from 'firebase/auth';

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC4Oe-a73CEUzo4sNTYqG6hHCCy_gJr0JM",
    authDomain: "caramelo-pdv-sistema.firebaseapp.com",
    projectId: "caramelo-pdv-sistema",
    storageBucket: "caramelo-pdv-sistema.firebasestorage.app",
    messagingSenderId: "1006273931367",
    appId: "1:1006273931367:web:a828444e3fac77d5374cc2"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function resetPassword() {
    try {
        console.log('🔐 Iniciando reset de senha...');

        // 1. Fazer login com senha antiga
        console.log('📧 Fazendo login com senha antiga...');
        const userCredential = await signInWithEmailAndPassword(
            auth,
            'lucasluob@gmail.com',
            '123456'
        );

        console.log('✅ Login bem-sucedido!');
        console.log('👤 Usuário:', userCredential.user.email);

        // 2. Atualizar para nova senha
        console.log('🔄 Atualizando senha...');
        await updatePassword(userCredential.user, '394061');

        console.log('✅ Senha atualizada com sucesso!');
        console.log('🎉 Nova senha: 394061');
        console.log('');
        console.log('Agora você pode fazer login com:');
        console.log('Email: lucasluob@gmail.com');
        console.log('Senha: 394061');

    } catch (error) {
        console.error('❌ Erro:', error.code, error.message);

        if (error.code === 'auth/wrong-password') {
            console.log('💡 A senha antiga não é 123456. Tente fazer login manualmente para descobrir a senha atual.');
        }
    }
}

// Executar
resetPassword();
