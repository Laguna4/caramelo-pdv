import { checkLimit } from './src/utils/plans.js';

console.log("--- INICIANDO SIMULAÇÃO DE LIMITE ---");

// Cenário 1: Plano BASIC com 500 produtos
console.log("\nTESTE 1: Plano BASIC com 500 produtos");
const resultBasic = checkLimit('BASIC', 'products', 500);
console.log(`Tentativa de adicionar o 501º produto: ${resultBasic.allowed ? 'PERMITIDO' : 'BLOQUEADO'}`);
if (!resultBasic.allowed) console.log(`Motivo: ${resultBasic.message}`);

// Cenário 2: Plano PRO com 500 produtos (Situação do Usuário)
console.log("\nTESTE 2: Plano PRO com 500 produtos");
const resultPro500 = checkLimit('PRO', 'products', 500);
console.log(`Tentativa de adicionar o 501º produto: ${resultPro500.allowed ? 'PERMITIDO (SUCESSO) ✅' : 'BLOQUEADO (ERRO) ❌'}`);

// Cenário 3: Plano PRO com 1999 produtos
console.log("\nTESTE 3: Plano PRO com 1999 produtos");
const resultPro1999 = checkLimit('PRO', 'products', 1999);
console.log(`Tentativa de adicionar o 2000º produto: ${resultPro1999.allowed ? 'PERMITIDO (SUCESSO) ✅' : 'BLOQUEADO ❌'}`);

// Cenário 4: Plano PRO com 2000 produtos
console.log("\nTESTE 4: Plano PRO com 2000 produtos");
const resultPro2000 = checkLimit('PRO', 'products', 2000);
console.log(`Tentativa de adicionar o 2001º produto: ${resultPro2000.allowed ? 'PERMITIDO' : 'BLOQUEADO (CORRETO) 🛡️'}`);

console.log("\n--- FIM DOS TESTES ---");
