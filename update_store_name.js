// Script para atualizar o nome da loja no Firebase
// Execute este arquivo no console do navegador (F12)

// Função para atualizar o nome da loja
async function updateStoreName() {
    try {
        // Pegar o usuário atual
        const currentUser = JSON.parse(localStorage.getItem('caramelo_currentUser'));

        if (!currentUser) {
            console.error('❌ Nenhum usuário logado encontrado!');
            return;
        }

        console.log('👤 Usuário atual:', currentUser.email);

        // Importar Firebase (já está carregado na página)
        const { db } = window;

        // Atualizar o nome da loja no Firestore
        const storeRef = doc(db, 'stores', currentUser.uid);
        await updateDoc(storeRef, {
            name: 'Caramelo Admin Master'
        });

        console.log('✅ Nome da loja atualizado para "Caramelo Admin Master"!');
        console.log('🔄 Recarregue a página (F5) para ver as mudanças.');

        // Atualizar localStorage também
        const storedStore = JSON.parse(localStorage.getItem('caramelo_currentStore'));
        if (storedStore) {
            storedStore.name = 'Caramelo Admin Master';
            localStorage.setItem('caramelo_currentStore', JSON.stringify(storedStore));
        }

        alert('✅ Nome atualizado! Recarregue a página (F5)');

    } catch (error) {
        console.error('❌ Erro ao atualizar:', error);
        alert('❌ Erro: ' + error.message);
    }
}

// Executar
updateStoreName();
