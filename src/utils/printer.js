// Helper for styles
const getStyles = (widthType) => {
    let styles = `
        body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 0; }
        .container { padding: 5px; }
        .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; }
        .title { font-weight: bold; font-size: 14px; text-transform: uppercase; }
        .info { font-size: 10px; }
        .items { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        .items th { border-bottom: 1px dashed #000; text-align: left; font-size: 10px; }
        .items td { text-align: left; padding: 2px 0; vertical-align: top; }
        .price { text-align: right; }
        .totals { border-top: 1px dashed #000; padding-top: 5px; text-align: right; }
        .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; }
        .footer { text-align: center; margin-top: 10px; font-size: 10px; border-top: 1px dashed #000; padding-top: 5px; }
        .voucher-box { border: 2px dashed #000; padding: 10px; margin: 10px 0; text-align: center; }
        .voucher-code { font-size: 18px; font-weight: bold; margin: 5px 0; }
        .voucher-val { font-size: 20px; font-weight: bold; }
    `;

    if (widthType === 'thermal_58') {
        styles += ` body { width: 58mm; } .title { font-size: 12px; } `;
    } else if (widthType === 'thermal_80') {
        styles += ` body { width: 80mm; } `;
    } else {
        styles += ` body { width: 100%; } .container { width: 80mm; border: 1px solid #ddd; margin: 10px; } @media print { .container { border: none; } } `;
    }
    return styles;
};

const createIframe = (html) => {
    // Abrir em nova aba para emular o comportamento de "PDF" e visualização
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        alert("Pop-up bloqueado! Por favor, autorize pop-ups para visualizar o comprovante.");
        return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Disparar a impressão após um pequeno delay para renderização
    setTimeout(() => {
        if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
        }
    }, 500);

    // Não fechamos a janela automaticamente para que o usuário possa visualizar o cupom
};

export const printReceipt = (sale, storeData, settings) => {
    const store = storeData || { name: 'Loja' };
    const printerType = settings?.receiptPrinter || 'thermal_80';
    if (printerType === 'none') return;

    const styles = getStyles(printerType);

    const receiptHtml = `
        <html>
        <head>
            <title>Recibo #${sale.id}</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="title">${store.name || 'LOJA'}</div>
                    <div class="info">
                        ${store.address || ''}<br/>
                        ${store.phone ? 'Tel: ' + store.phone : ''}<br/>
                        ${store.cnpj ? 'CNPJ: ' + store.cnpj : ''}<br/>
                    </div>
                </div>
                
                <div class="info" style="margin-bottom: 5px;">
                    Data: ${new Date(sale.date).toLocaleString()}<br/>
                    Venda: #${sale.id.slice(-6).toUpperCase()} | Vend: ${sale.sellerName || 'Loja'}
                </div>

                <table class="items">
                    <thead>
                        <tr>
                            <th style="width: 50%">ITEM</th>
                            <th style="width: 15%">QTD</th>
                            <th style="width: 35%" class="price">VALOR</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map(item => `
                            <tr>
                                <td>${item.name.substring(0, 20)}</td>
                                <td>${item.quantity}</td>
                                <td class="price">${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="totals">
                    <div class="total-row">
                        <span>TOTAL</span>
                        <span>R$ ${sale.total.toFixed(2)}</span>
                    </div>
                    <div style="font-size: 11px; margin-top: 5px;">
                        Pagamento: ${translatePaymentMethod(sale.payment?.method || 'Dinheiro')}
                        ${sale.payment?.installments ? `(${sale.payment.installments}x)` : ''}
                    </div>
                </div>

                <div class="footer">
                    ${store.receiptFooter || 'Obrigado pela preferência!'}<br/>
                    <br/>
                    <small>System Vexa</small>
                </div>
            </div>
        </body>
        </html>
    `;

    createIframe(receiptHtml);
};

export const printVoucher = (voucher, storeData, settings) => {
    // Debug: Check if settings exist
    if (!settings || Object.keys(settings).length === 0) {
        // Fallback or Alert? Let's just alert for now to help user debug
        // console.warn("Settings empty, defaulting to thermal_80");
        // We can just proceed with defaults, but let's log it.
    }

    const store = storeData || { name: 'Loja' };

    // Explicitly check for 'none'
    const printerType = settings?.ticketPrinter || settings?.receiptPrinter || 'thermal_80';

    if (printerType === 'none') {
        alert("Impressão desativada nas Configurações.\nVá em Configurações > Impressora e selecione um modelo.");
        return;
    }

    const styles = getStyles(printerType);

    // Safety for potential missing dates/values
    const val = parseFloat(voucher.value || 0).toFixed(2);
    const dateGen = voucher.createdAt ? new Date(voucher.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
    const dateExp = voucher.expiresAt ? new Date(voucher.expiresAt).toLocaleDateString() : voucher.expiry ? new Date(voucher.expiry).toLocaleDateString() : '-';

    const html = `
        <html>
        <head>
            <title>Vale Troca #${voucher.code}</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="title">${store.name || 'LOJA'}</div>
                </div>
                
                <div class="voucher-box">
                    <div>VALE TROCA</div>
                    <div class="voucher-code">${voucher.code}</div>
                    <div class="voucher-val">R$ ${val}</div>
                </div>

                <div class="info" style="text-align: center;">
                    Gerado em: ${dateGen}<br/>
                    Válido até: ${dateExp}<br/>
                    <br/>
                    Apresente este código no caixa.<br/>
                    (Não perca este comprovante)
                </div>

                <div class="footer">
                    <small>System Vexa</small>
                </div>
            </div>
        </body>
        </html>
    `;

    createIframe(html);
};

export const printDebtReceipt = (debt, inst, storeData, settings) => {
    const store = storeData || { name: 'Loja' };
    const printerType = settings?.receiptPrinter || 'thermal_80';
    if (printerType === 'none') return;

    const styles = getStyles(printerType);
    const val = parseFloat(inst.amount || 0).toFixed(2);
    const datePaid = inst.paidAt ? new Date(inst.paidAt).toLocaleString() : new Date().toLocaleString();

    const html = `
        <html>
        <head>
            <title>Comprovante de Pagamento</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="title">${store.name || 'LOJA'}</div>
                    <div class="info">
                        ${store.address || ''}<br/>
                        ${store.phone ? 'Tel: ' + store.phone : ''}<br/>
                        COMPROVANTE DE RECEBIMENTO
                    </div>
                </div>
                
                <div class="info" style="margin-bottom: 5px;">
                    Data: ${datePaid}<br/>
                    Cliente: ${debt.customerName}<br/>
                    Vendedor: ${debt.sellerName || 'Loja'}
                </div>
 
                <div style="border-top: 1px dashed #000; padding: 5px 0;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px;">
                        <span>PARCELA:</span>
                        <span>${inst.number} de ${debt.installments?.length || 1}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px;">
                        <span>FORMA PAG.:</span>
                        <span>${inst.paymentMethod || 'DINHEIRO'}</span>
                    </div>
                </div>

                <div class="totals">
                    <div class="total-row">
                        <span>VALOR PAGO</span>
                        <span>R$ ${val}</span>
                    </div>
                    ${debt.remainingAmount > 0 ? `
                        <div style="font-size: 10px; margin-top: 3px; text-align: right; color: #666;">
                            Saldo Devedor: R$ ${debt.remainingAmount.toFixed(2)}
                        </div>
                    ` : `
                        <div style="font-size: 10px; margin-top: 3px; text-align: right; font-weight: bold; color: #000;">
                            DÍVIDA QUITADA!
                        </div>
                    `}
                </div>

                <div class="footer">
                    ${store.receiptFooter || 'Obrigado pela preferência!'}<br/>
                    <br/>
                    <small>System Vexa</small>
                </div>
            </div>
        </body>
        </html>
    `;

    createIframe(html);
};

export const printComandaPreBill = (comanda, storeData, settings) => {
    const store = storeData || { name: 'Loja' };
    const printerType = settings?.receiptPrinter || 'thermal_80';
    if (printerType === 'none') {
        alert("Impressão desativada nas Configurações.\nVá em Configurações > Impressora e selecione um modelo.");
        return;
    }

    const styles = getStyles(printerType);
    const subtotal = comanda.total || 0;
    const taxaServico = store.enableServiceTax ? (subtotal * 0.1) : 0;
    const totalGeral = subtotal + taxaServico;

    const html = `
        <html>
        <head>
            <title>Pré-Conta - ${comanda.identificador}</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="title">${store.name || 'LOJA'}</div>
                    <div class="info">
                        ** CONFERÊNCIA DE MESA **<br/>
                        NÃO É DOCUMENTO FISCAL
                    </div>
                </div>
                
                <div class="info" style="margin-bottom: 10px; text-align: center; font-size: 14px; font-weight: bold;">
                    MESA / COMANDA: ${comanda.identificador.toUpperCase()}<br/>
                    <span style="font-size: 10px; font-weight: normal;">Data: ${new Date().toLocaleString()}</span>
                </div>

                <table class="items">
                    <thead>
                        <tr>
                            <th style="width: 50%">ITEM</th>
                            <th style="width: 15%">QTD</th>
                            <th style="width: 35%" class="price">VALOR</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(comanda.itens || []).map(item => `
                            <tr>
                                <td>${item.name.substring(0, 20)}</td>
                                <td>${item.quantity}</td>
                                <td class="price">${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="totals">
                    <div style="font-size: 11px; display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span>Subtotal:</span>
                        <span>R$ ${subtotal.toFixed(2)}</span>
                    </div>
                    ${store.enableServiceTax ? `
                    <div style="font-size: 11px; display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span>Taxa de Serviço (10%):</span>
                        <span>R$ ${taxaServico.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row" style="margin-top: 5px; font-size: 16px;">
                        <span>TOTAL:</span>
                        <span>R$ ${totalGeral.toFixed(2)}</span>
                    </div>
                </div>

                <div class="footer">
                    Obrigado pela preferência!<br/>
                    <br/>
                    <small>System Vexa</small>
                </div>
            </div>
        </body>
        </html>
    `;

    createIframe(html);
};

export const printDebtorReport = (debts, storeData) => {
    const store = storeData || { name: 'Loja' };
    const styles = `
        ${getStyles('thermal_80')}
        .debtor-row { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 5px 0; font-size: 11px; }
        .debtor-name { font-weight: bold; }
        .debtor-amount { font-family: monospace; }
    `;

    const pendingDebts = debts.filter(d => d.remainingAmount > 0.01);
    const totalPending = pendingDebts.reduce((acc, d) => acc + d.remainingAmount, 0);

    const html = `
        <html>
        <head>
            <title>Relatório de Devedores</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="title">RELATÓRIO DE DEVEDORES</div>
                    <div class="info">
                        ${store.name || 'LOJA'}<br/>
                        Gerado em: ${new Date().toLocaleString()}
                    </div>
                </div>

                <div style="margin-bottom: 10px;">
                    ${pendingDebts.map(d => `
                        <div class="debtor-row">
                            <span class="debtor-name">${d.customerName.toUpperCase()}</span>
                            <span class="debtor-amount">R$ ${d.remainingAmount.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="totals" style="border-top: 2px solid #000; padding-top: 10px;">
                    <div class="total-row">
                        <span>TOTAL PENDENTE</span>
                        <span>R$ ${totalPending.toFixed(2)}</span>
                    </div>
                </div>

                <div class="footer">
                    <small>System Vexa - Total de ${pendingDebts.length} devedores</small>
                </div>
            </div>
        </body>
        </html>
    `;

    createIframe(html);
};

export const printCustomerHistory = (customer, sales, storeData) => {
    const store = storeData || { name: 'Loja' };
    const styles = `
        ${getStyles('thermal_80')}
        .history-row { border-bottom: 1px solid #eee; padding: 8px 0; font-size: 10px; }
        .history-header { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 3px; }
        .history-items { font-size: 9px; color: #555; font-style: italic; }
        .history-total { text-align: right; font-weight: bold; margin-top: 2px; }
    `;

    const totalSpent = sales.reduce((acc, s) => acc + (s.total || 0), 0);

    const html = `
        <html>
        <head>
            <title>Histórico - ${customer.name}</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="title">HISTÓRICO DO CLIENTE</div>
                    <div class="info">
                        ${customer.name.toUpperCase()}<br/>
                        ${customer.phone || ''}<br/>
                        Gerado em: ${new Date().toLocaleString()}
                    </div>
                </div>

                <div style="margin-bottom: 15px;">
                    ${sales.map(s => `
                        <div class="history-row">
                            <div class="history-header">
                                <span>#${(s.id || '').slice(-6).toUpperCase()} - ${new Date(s.date || s.createdAt).toLocaleDateString()}</span>
                                <span>${translatePaymentMethod(s.payment?.method || s.paymentMethod || 'Outro')}</span>
                            </div>
                            <div class="history-items">
                                ${(s.items || []).map(i => `${i.quantity}x ${i.name.substring(0, 20)}`).join(', ')}
                            </div>
                            <div class="history-total">R$ ${(s.total || 0).toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>

                <div class="totals" style="border-top: 2px solid #000; padding-top: 10px;">
                    <div class="total-row">
                        <span>TOTAL GERAL GASTO</span>
                        <span>R$ ${totalSpent.toFixed(2)}</span>
                    </div>
                    <div style="text-align: right; font-size: 10px; margin-top: 5px;">
                        Total de ${sales.length} compras
                    </div>
                </div>

                <div class="footer">
                    <small>${store.name || 'Sistema Vexa'}</small>
                </div>
            </div>
        </body>
        </html>
    `;

    createIframe(html);
};

const translatePaymentMethod = (method) => {
    const map = {
        'CREDIT': 'Crédito',
        'DEBIT': 'Débito',
        'CASH': 'Dinheiro',
        'PIX': 'PIX',
        'TICKET': 'Vale',
        'CREDIARIO': 'Crediário',
        'MONEY': 'Dinheiro',
        'CREDIT_CARD': 'Crédito',
        'DEBIT_CARD': 'Débito',
        'VOUCHER': 'Vale'
    };
    return map[method] || method;
};
