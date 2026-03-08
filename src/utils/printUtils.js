export const printBudget = (shopInfo, customerInfo, budgetItems, budgetTotal, budgetDate, printerSettings) => {
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const isThermal = printerSettings.receiptPrinter.startsWith('thermal');
    const width = printerSettings.receiptPrinter === 'thermal_58' ? '58mm' : (isThermal ? '80mm' : '100%');

    let printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Orçamento - ${shopInfo.name}</title>
            <style>
                @page { margin: 0.5cm; }
                body { 
                    font-family: 'Arial', sans-serif; 
                    width: ${isThermal ? width : '100%'}; 
                    margin: 0 auto; 
                    padding: ${isThermal ? '5px' : '20px'};
                    color: #000;
                    line-height: 1.4;
                    font-size: ${isThermal ? '11px' : '13px'};
                }
                .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                .shop-name { font-size: ${isThermal ? '16px' : '20px'}; font-weight: 900; text-transform: uppercase; margin-bottom: 5px; }
                .info-line { display: block; font-size: ${isThermal ? '10px' : '12px'}; color: #333; }
                .title { text-align: center; font-weight: 900; margin: 20px 0; font-size: ${isThermal ? '14px' : '18px'}; border: 2px solid #000; padding: 8px; background: #eee; text-transform: uppercase; letter-spacing: 2px; }
                .section { margin-bottom: 15px; border: 1px solid #ddd; padding: 10px; border-radius: 4px; }
                .section-title { font-weight: 900; text-transform: uppercase; font-size: 10px; color: #666; border-bottom: 1px solid #eee; margin-bottom: 8px; padding-bottom: 4px; }
                .customer-info { font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th { border-bottom: 2px solid #000; text-align: left; padding: 8px 4px; font-weight: 900; text-transform: uppercase; font-size: 10px; }
                td { padding: 8px 4px; vertical-align: top; border-bottom: 1px solid #eee; }
                .total-box { margin-top: 20px; border-top: 2px solid #000; padding-top: 10px; text-align: right; }
                .total-label { font-size: 10px; font-weight: bold; text-transform: uppercase; }
                .total-value { font-size: ${isThermal ? '18px' : '24px'}; font-weight: 900; }
                .footer { text-align: center; margin-top: 40px; font-size: 9px; color: #777; font-style: italic; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="shop-name">${shopInfo.name || 'NOME DA LOJA NÃO DEFINIDO'}</div>
                <div class="info-line"><strong>CNPJ:</strong> ${shopInfo.cnpj || '- - -'}</div>
                <div class="info-line"><strong>ENDEREÇO:</strong> ${shopInfo.address || '- - -'}</div>
                <div class="info-line"><strong>CONTATO:</strong> ${shopInfo.phone || '- - -'}</div>
            </div>

            <div class="title">Orçamento de Venda</div>

            <div class="section">
                <div class="section-title">DADOS DO CLIENTE</div>
                <div class="info">NOME: ${customerInfo.name}</div>
                ${customerInfo.cpf ? `<div class="info">CPF/CNPJ: ${customerInfo.cpf}</div>` : ''}
                ${customerInfo.phone ? `<div class="info">TELEFONE: ${customerInfo.phone}</div>` : ''}
            </div>

            <div class="section">
                <div class="info">DATA: ${new Date(budgetDate).toLocaleString('pt-BR')}</div>
                <div class="info">NÚMERO: ${Math.floor(Math.random() * 90000) + 10000}</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 10%;">QTD</th>
                        <th style="width: 60%;">PRODUTO</th>
                        <th style="width: 30%; text-align: right;">VALOR</th>
                    </tr>
                </thead>
                <tbody>
                    ${budgetItems.map(item => `
                        <tr>
                            <td>${item.quantity}</td>
                            <td>${item.name}</td>
                            <td style="text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr class="total-row">
                        <td colspan="2" style="text-align: right; padding-top: 10px;">TOTAL GERAL:</td>
                        <td style="text-align: right; padding-top: 10px;">${formatCurrency(budgetTotal)}</td>
                    </tr>
                </tfoot>
            </table>

            <div class="footer">
                <p>Este documento não possui validade fiscal.</p>
                <p>${shopInfo.receiptFooter || 'Obrigado pela preferência!'}</p>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
};
