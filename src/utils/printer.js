// Helper for styles
const getStyles = (widthType) => {
    let styles = `
        body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 0; color: #000; }
        .container { padding: 5px; }
        .header { text-align: center; margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
        .title { font-weight: bold; font-size: 16px; text-transform: uppercase; margin-bottom: 2px; }
        .info { font-size: 10px; line-height: 1.2; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; border-bottom: 1px solid #eee; }
        
        .items { width: 100%; border-collapse: collapse; margin: 5px 0; }
        .items th { border-bottom: 1px solid #000; text-align: left; font-size: 9px; padding-bottom: 2px; }
        .items td { text-align: left; padding: 3px 0; vertical-align: top; font-size: 10px; }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }
        
        .totals { margin-top: 5px; border-top: 1px dashed #000; padding-top: 5px; }
        .total-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
        .total-main { font-size: 18px; font-weight: 900; margin-top: 5px; border-top: 1px double #000; padding-top: 5px; }
        
        .footer { text-align: center; margin-top: 15px; font-size: 9px; border-top: 1px dashed #000; padding-top: 8px; line-height: 1.3; }
        
        .payment-info { font-size: 10px; margin-top: 5px; font-style: italic; }
        
        @media print {
            @page { margin: 0; }
        }
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Pop-up bloqueado! Por favor, autorize pop-ups para visualizar o comprovante.");
        return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
        if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
        }
    }, 500);
};

export const printReceipt = (sale, storeData, settings) => {
    const store = storeData || { name: 'Loja' };
    const printerType = settings?.receiptPrinter || 'thermal_80';
    if (printerType === 'none') return;

    const styles = getStyles(printerType);

    const isCrediario = ['crediario', 'fiado', 'credito_loja', 'crediário', 'CREDIARIO'].includes(
        (sale.payment?.method || '').toUpperCase()
    ) || (sale.payment?.payments || []).some(p => ['crediario', 'fiado', 'credito_loja', 'crediário', 'CREDIARIO'].includes((p.method || p.methodLabel || '').toUpperCase()));

    const crediarioHtml = isCrediario ? `
        <div style="border: 2px solid #000; padding: 6px; margin: 8px 0; text-align: center;">
            <div style="font-size: 13px; font-weight: bold; letter-spacing: 1px;">⚠ CREDIÁRIO / FIADO ⚠</div>
            <div style="font-size: 10px;">
                ${(() => {
                    const pay = (sale.payment?.payments || []).find(p => ['crediario', 'fiado', 'credito_loja'].includes((p.method || p.methodLabel || '').toLowerCase())) || sale.payment;
                    const installments = parseInt(pay?.installments || sale.payment?.installments) || 1;
                    const amount = parseFloat(pay?.amount || sale.total) || 0;
                    return `${installments}x de R$ ${(amount / installments).toFixed(2)}`;
                })()}
            </div>
        </div>
        <div style="border-top: 1px dashed #000; padding: 6px 0; margin-top: 4px;">
            <div style="font-weight: bold; font-size: 11px; margin-bottom: 3px;">DADOS DO CLIENTE</div>
            <div style="font-size: 11px;">Nome: <b>${sale.customer?.name || sale.customerName || '-'}</b></div>
            ${sale.customer?.cpf ? `<div style="font-size: 11px;">CPF: ${sale.customer.cpf}</div>` : ''}
            ${sale.customer?.phone ? `<div style="font-size: 11px;">Tel: ${sale.customer.phone}</div>` : ''}
            ${sale.customer?.address ? `<div style="font-size: 11px;">End: ${sale.customer.address}</div>` : ''}
        </div>
        <div style="border-top: 1px dashed #000; padding: 6px 0; margin-top: 4px;">
            <div style="font-weight: bold; font-size: 11px; margin-bottom: 5px;">CRONOGRAMA DE PAGAMENTO</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                    <tr style="border-bottom: 1px solid #000;">
                        <th style="text-align: left; padding-bottom: 3px;">Parcela</th>
                        <th style="text-align: center; padding-bottom: 3px;">Vencimento</th>
                        <th style="text-align: right; padding-bottom: 3px;">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${(() => {
                        const pay = (sale.payment?.payments || []).find(p => ['crediario', 'fiado', 'credito_loja'].includes((p.method || p.methodLabel || '').toLowerCase())) || sale.payment;
                        const numParcelas = parseInt(pay?.installments || sale.payment?.installments) || 1;
                        const totalVal = parseFloat(pay?.amount || sale.total) || 0;
                        const valorParcela = totalVal / numParcelas;
                        const saleDate = sale.date ? new Date(sale.date) : new Date();
                        let rows = '';
                        for (let i = 1; i <= numParcelas; i++) {
                            const dueDate = new Date(saleDate);
                            dueDate.setMonth(dueDate.getMonth() + i);
                            const dueDateStr = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            rows += `
                                <tr style="border-bottom: 1px dashed #ccc;">
                                    <td style="padding: 3px 0;">${i}ª parcela</td>
                                    <td style="text-align: center; padding: 3px 0;">${dueDateStr}</td>
                                    <td style="text-align: right; padding: 3px 0; font-weight: bold;">R$ ${valorParcela.toFixed(2)}</td>
                                </tr>`;
                        }
                        return rows;
                    })()}
                </tbody>
            </table>
        </div>
        <div style="border-top: 1px dashed #000; margin-top: 12px; padding-top: 10px;">
            <div style="font-size: 10px; margin-bottom: 30px;">Declaro que estou ciente das condições de pagamento acima.</div>
            <div style="border-top: 1px solid #000; margin-top: 5px; padding-top: 3px; text-align: center; font-size: 10px;">Assinatura do Cliente</div>
        </div>
    ` : '';

    const receiptHtml = `
        <html>
        <head>
            <title>Recibo #${sale.id}</title>
            <style>${styles}</style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="title">${store.name || 'CARAMELO PDV'}</div>
                    <div class="info">
                        ${store.cnpj ? 'CNPJ: ' + store.cnpj : ''}${store.cnpj && store.address ? '<br/>' : ''}
                        ${store.address || ''}${store.address && store.phone ? '<br/>' : ''}
                        ${store.phone ? 'Tel: ' + store.phone : ''}
                    </div>
                </div>
                <div class="info">
                    <div class="bold">CUPOM NÃO FISCAL</div>
                    Data: ${new Date(sale.date).toLocaleString().split(',').join(' - ')}<br/>
                    Venda: #${sale.id.slice(-8).toUpperCase()}<br/>
                    Vendedor: ${sale.sellerName || 'Operador'}
                </div>
                ${sale.customer ? `
                    <div class="divider"></div>
                    <div class="section-title">Cliente</div>
                    <div class="info">
                        ${sale.customer.name.toUpperCase()}<br/>
                        ${sale.customer.cpf ? 'CPF: ' + sale.customer.cpf : ''}
                    </div>
                ` : ''}
                <div class="divider"></div>
                <table class="items">
                    <thead>
                        <tr>
                            <th style="width: 45%">ITEM</th>
                            <th style="width: 15%" class="text-center">QTD</th>
                            <th style="width: 20%" class="text-right">UN</th>
                            <th style="width: 20%" class="text-right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map(item => `
                            <tr>
                                <td>${item.name.toUpperCase().substring(0, 24)}</td>
                                <td class="text-center">${item.quantity}</td>
                                <td class="text-right">${item.price.toFixed(2)}</td>
                                <td class="text-right bold">${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="totals">
                    <div class="total-row">
                        <span>SUBTOTAL</span>
                        <span>R$ ${sale.total.toFixed(2)}</span>
                    </div>
                    ${sale.payment?.discount > 0 ? `
                        <div class="total-row">
                            <span>DESCONTO</span>
                            <span>-R$ ${sale.payment.discount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="total-row total-main">
                        <span>PAGAR</span>
                        <span>R$ ${(sale.total - (sale.payment?.discount || 0)).toFixed(2)}</span>
                    </div>
                </div>
                <div class="payment-info">
                    ${sale.payment?.payments ? `
                        <div style="font-weight: bold; border-bottom: 1px solid #eee; margin-bottom: 3px;">PAGAMENTOS:</div>
                        ${sale.payment.payments.map(p => `
                            <div style="display: flex; justify-content: space-between;">
                                <span>${translatePaymentMethod(p.methodLabel || p.method)}:</span>
                                <span>R$ ${parseFloat(p.amount).toFixed(2)}</span>
                            </div>
                        `).join('')}
                        ${sale.payment?.change > 0 ? `
                            <div style="display: flex; justify-content: space-between; margin-top: 2px; border-top: 1px dotted #000;">
                                <span>TROCO:</span>
                                <span>R$ ${parseFloat(sale.payment.change).toFixed(2)}</span>
                            </div>
                        ` : ''}
                    ` : `
                        FORMA DE PAGAMENTO: ${translatePaymentMethod(sale.payment?.method || 'Dinheiro')}
                        ${sale.payment?.installments > 1 ? `(${sale.payment.installments}x)` : ''}
                    `}
                </div>
                ${crediarioHtml}
                <div class="footer">
                    ${store.receiptFooter || 'Obrigado pela preferência!'}<br/>
                    <br/>
                    <small>Caramelo PDV</small>
                </div>
            </div>
        </body>
        </html>
    `;
    createIframe(receiptHtml);
};

export const printVoucher = (voucher, storeData, settings) => {
    const store = storeData || { name: 'Loja' };
    const printerType = settings?.ticketPrinter || settings?.receiptPrinter || 'thermal_80';
    if (printerType === 'none') {
        alert("Impressão desativada nas Configurações.\nVá em Configurações > Impressora e selecione um modelo.");
        return;
    }
    const styles = getStyles(printerType);
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
                    <small>Caramelo PDV</small>
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
                    <small>Caramelo PDV</small>
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
                    <small>Caramelo PDV</small>
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
                    <small>Caramelo PDV - Total de ${pendingDebts.length} devedores</small>
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
                    <small>${store.name || 'Sistema Caramelo'}</small>
                </div>
            </div>
        </body>
        </html>
    `;
    createIframe(html);
};

const translatePaymentMethod = (method) => {
    const map = {
        'VOUCHER': 'Vale',
        'MONEY': 'Dinheiro',
        'CASH': 'Dinheiro',
        'CREDIT_CARD': 'Crédito',
        'DEBIT_CARD': 'Débito',
        'PIX': 'PIX',
        'crediário': 'Crediário',
        'CREDIARIO': 'Crediário',
        'TICKET': 'Vale'
    };
    return map[method] || method;
};
