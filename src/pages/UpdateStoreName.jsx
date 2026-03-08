import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// Componente temporário para atualizar o nome da loja
// Acesse: http://localhost:5176/update-store-name

const UpdateStoreName = () => {
    useEffect(() => {
        const updateName = async () => {
            try {
                // Pegar usuário do localStorage
                const currentUser = JSON.parse(localStorage.getItem('caramelo_currentUser'));

                if (!currentUser) {
                    alert('❌ Você precisa estar logado!');
                    return;
                }

                console.log('Atualizando loja para:', currentUser.uid);

                // Atualizar no Firestore
                const storeRef = doc(db, 'stores', currentUser.uid);
                await updateDoc(storeRef, {
                    name: 'Caramelo Admin Master'
                });

                // Atualizar localStorage
                const storedStore = JSON.parse(localStorage.getItem('caramelo_currentStore'));
                if (storedStore) {
                    storedStore.name = 'Caramelo Admin Master';
                    localStorage.setItem('caramelo_currentStore', JSON.stringify(storedStore));
                }

                alert('✅ Nome atualizado para "Caramelo Admin Master"!\n\nVolte para o Dashboard (/)');
                window.location.href = '/';

            } catch (error) {
                console.error('Erro:', error);
                alert('❌ Erro ao atualizar: ' + error.message);
            }
        };

        updateName();
    }, []);

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            flexDirection: 'column',
            gap: '1rem'
        }}>
            <h1>🔄 Atualizando nome da loja...</h1>
            <p>Aguarde um momento...</p>
        </div>
    );
};

export default UpdateStoreName;
