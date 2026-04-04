# 🐂 ToroPDV - Sistema de Ponto de Venda Poderoso

Sistema completo de PDV (Ponto de Venda) desenvolvido para lojas que buscam força e eficiência nas vendas, com modelo de negócio SaaS (Software as a Service) com cobrança de mensalidade.

## 🎯 Sobre o Projeto

O **ToroPDV** é um sistema multi-tenant robusto e poderoso que permite que você venda assinaturas mensais para lojas que precisam de um sistema de ponto de venda profissional. Cada loja tem seus próprios dados isolados e pode gerenciar produtos, vendas e estoque de forma independente.

## ✨ Funcionalidades Principais

### Para os Clientes (Lojas)
- 📱 **Scanner de Código de Barras** - Suporte para leitores USB e entrada manual
- 🛒 **Carrinho de Compras** - Gestão completa com controle de quantidades
- 💰 **Múltiplas Formas de Pagamento** - Dinheiro, Cartão de Crédito/Débito, PIX
- 📦 **Gestão de Produtos** - CRUD completo com categorias e controle de estoque
- 🏷️ **Geração de Código de Barras** - Criação automática de códigos EAN-13
- 📊 **Controle de Estoque** - Atualização automática após vendas
- 🎨 **Interface Moderna** - Design profissional e responsivo

### Para Você (Administrador)
- 👥 **Sistema Multi-tenant** - Cada loja tem dados isolados
- 💳 **Gestão de Assinaturas** - Controle de planos e pagamentos
- 🎁 **Período de Teste** - 30 dias grátis para novos clientes
- 📈 **Escalabilidade** - Arquitetura preparada para crescimento

## 💰 Planos de Assinatura

### Básico - R$ 49,90/mês
- 1 usuário
- Até 500 produtos
- Vendas ilimitadas
- Suporte por email
- Relatórios básicos

### Profissional - R$ 99,90/mês
- 3 usuários
- Até 2000 produtos
- Vendas ilimitadas
- Suporte prioritário
- Relatórios avançados
- Backup automático

### Premium - R$ 199,90/mês
- Usuários ilimitados
- Produtos ilimitados
- Vendas ilimitadas
- Suporte 24/7
- Relatórios personalizados
- API para integrações
- Backup em tempo real

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ instalado
- npm ou yarn

### Instalação

1. **Navegue até a pasta do projeto:**
```bash
cd C:\Users\Luob\lavic-shop-new\vexa-pdv
```

2. **As dependências já foram instaladas, mas se precisar reinstalar:**
```bash
npm install
```

3. **Inicie o servidor de desenvolvimento:**
```bash
npm run dev
```

4. **Acesse no navegador:**
```
http://localhost:5174
```

## 📖 Como Usar

### Primeira Vez

1. **Criar uma Conta**
   - Clique em "Criar nova conta"
   - Preencha os dados da loja
   - Você terá 30 dias grátis para testar!

2. **Cadastrar Produtos**
   - Vá em "Produtos" no menu
   - Clique em "Novo Produto"
   - Preencha os dados e gere um código de barras
   - Salve o produto

3. **Fazer Vendas**
   - Vá em "PDV" no menu
   - Escaneie o código de barras ou busque o produto
   - Adicione ao carrinho
   - Clique em "Finalizar Venda"
   - Escolha a forma de pagamento
   - Confirme!

### Testando o Scanner de Código de Barras

**Modo USB (Leitor de Código de Barras):**
- Conecte um leitor USB
- Aponte para o código de barras
- O produto será adicionado automaticamente

**Modo Manual:**
- Clique em "Manual"
- Digite o código de barras
- Clique em "Adicionar Produto"

**Códigos de Barras de Teste:**
- 7891234567890 - Camiseta Básica Branca
- 7891234567894 - Batom Vermelho Matte
- 7891234567895 - Base Líquida FPS 30

## 🏗️ Estrutura do Projeto

```
vexa-pdv/
├── src/
│   ├── components/          # Componentes reutilizáveis
│   │   ├── BarcodeScanner.jsx
│   │   ├── Cart.jsx
│   │   ├── PaymentModal.jsx
│   │   └── ProductCard.jsx
│   ├── pages/              # Páginas da aplicação
│   │   ├── Login.jsx
│   │   ├── POS.jsx
│   │   └── Products.jsx
│   ├── utils/              # Utilitários
│   │   ├── storage.js
│   │   └── calculations.js
│   ├── data/               # Dados de exemplo
│   │   └── sampleProducts.js
│   ├── config.js           # Configurações
│   ├── index.css           # Design System
│   ├── App.jsx             # Componente principal
│   └── main.jsx            # Entry point
├── index.html
├── package.json
└── vite.config.js
```

## 🔧 Tecnologias Utilizadas

- **React 18** - Framework frontend
- **Vite** - Build tool e dev server
- **React Router** - Navegação
- **React Icons** - Ícones
- **LocalStorage** - Armazenamento (demo)
- **CSS Vanilla** - Estilização

## 🔮 Próximos Passos

### Para Produção

1. **Integrar Firebase**
   - Substituir LocalStorage por Firestore
   - Implementar autenticação real
   - Configurar regras de segurança

2. **Integrar Pagamentos**
   - Mercado Pago para cobrar mensalidades
   - Webhook para confirmação de pagamentos
   - Bloqueio automático por inadimplência

3. **Funcionalidades Adicionais**
   - Relatórios de vendas
   - Gráficos e dashboards
   - Exportação de dados
   - Impressão de cupom fiscal
   - Notificações por email/SMS

4. **Deploy**
   - Hospedar no Vercel (grátis)
   - Configurar domínio customizado
   - SSL automático

## 💡 Modelo de Negócio

### Custos Iniciais: R$ 0
- Firebase (Plano Spark) - Grátis
- Vercel (Hosting) - Grátis
- Mercado Pago - Sem mensalidade (só taxa por transação)

### Projeção de Receita

**10 clientes no plano Básico:**
- Receita: R$ 499/mês
- Custo: ~R$ 50/mês (Firebase)
- **Lucro: R$ 449/mês**

**50 clientes (mix de planos):**
- Receita: ~R$ 4.000/mês
- Custo: ~R$ 200/mês
- **Lucro: R$ 3.800/mês**

**100 clientes:**
- Receita: ~R$ 9.000/mês
- Custo: ~R$ 500/mês
- **Lucro: R$ 8.500/mês**

## 📝 Licença

Este projeto foi desenvolvido para uso comercial. Todos os direitos reservados.

## 🤝 Suporte

Para dúvidas ou suporte, entre em contato através do email configurado no sistema.

---

**Desenvolvido com ❤️ para revolucionar o varejo de moda e beleza**
