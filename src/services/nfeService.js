/**
 * Service to parse Brazilian NFe (Nota Fiscal Eletrônica) XML.
 */

export const parseNFeXML = (xmlString) => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        // Check for parsing errors
        const errorNode = xmlDoc.querySelector("parsererror");
        if (errorNode) throw new Error("Erro ao ler arquivo XML");

        // Basic NFe Info
        const infNFe = xmlDoc.querySelector("infNFe");
        if (!infNFe) throw new Error("Arquivo não parece ser uma NFe válida");

        const items = [];
        const detNodes = xmlDoc.querySelectorAll("det");

        detNodes.forEach((det) => {
            const prod = det.querySelector("prod");
            if (!prod) return;

            // Extract fields based on SEFAZ NFe schema
            const item = {
                name: prod.querySelector("xProd")?.textContent || "Produto sem nome",
                barcode: prod.querySelector("cEAN")?.textContent === "SEM GTIN" ? "" : prod.querySelector("cEAN")?.textContent,
                sku: prod.querySelector("cProd")?.textContent || "",
                ncm: prod.querySelector("NCM")?.textContent || "",
                cfop: prod.querySelector("CFOP")?.textContent || "5102",
                unit: prod.querySelector("uCom")?.textContent || "UN",
                quantity: parseFloat(prod.querySelector("qCom")?.textContent || "0"),
                costPrice: parseFloat(prod.querySelector("vUnCom")?.textContent || "0"),
                totalValue: parseFloat(prod.querySelector("vProd")?.textContent || "0"),
                // Generate a temporary ID for UI mapping
                tempId: Math.random().toString(36).substr(2, 9)
            };

            items.push(item);
        });

        // Supplier Info
        const emit = xmlDoc.querySelector("emit");
        const supplier = {
            name: emit?.querySelector("xNome")?.textContent || "Fornecedor desconhecido",
            cnpj: emit?.querySelector("CNPJ")?.textContent || "",
        };

        return { items, supplier };
    } catch (error) {
        console.error("NFe Parsing Error:", error);
        throw error;
    }
};

// ============================================================================
// FOCUS NFE API INTEGRATION (EMISSION)
// ============================================================================

import { getStore } from "./dbService";
import { functions } from "./firebase";
import { httpsCallable } from "firebase/functions";

const cleanDocument = (doc) => {
    if (!doc) return '';
    return doc.replace(/[^\d]/g, '');
};

const mapSaleToFocusPayload = (store, sale) => {
    let customerCpfCnpj = '';
    let customerName = 'Consumidor Final';

    if (sale.cpfCnpj) {
        customerCpfCnpj = cleanDocument(sale.cpfCnpj);
    } else if (sale.customer) {
        customerCpfCnpj = cleanDocument(sale.customer.cpfCnpj || sale.customer.cpf || sale.customer.cnpj || '');
        customerName = sale.customer.name || 'Consumidor Final';
    }

    // Auto-pad CPF (11) or CNPJ (14) if they are slightly shorter due to leading zeros
    if (customerCpfCnpj.length > 0 && customerCpfCnpj.length <= 11) {
        customerCpfCnpj = customerCpfCnpj.padStart(11, '0');
    } else if (customerCpfCnpj.length > 11 && customerCpfCnpj.length <= 14) {
        customerCpfCnpj = customerCpfCnpj.padStart(14, '0');
    }

    const isModel55 = sale.nfeModel === '55';

    const focusItems = sale.items.map((item, index) => {
        // DEFAULT NCM for clothing (61091000) if not provided, as 00000000 is invalid for SEFAZ
        const ncm = cleanDocument(item.ncm) || '61091000'; 
        const cfop = item.cfop || (isModel55 ? '5102' : '5102');
        const origin = item.origin || '0';
        
        // Simples Nacional status (CRT 1) uses CSOSN like 102. Normal (CRT 3) uses CST like 00.
        const situation = store.nfeCrt === '3' ? '00' : '102';
        const itemTotal = (item.price * item.quantity);

        const itemPayload = {
            numero_item: (index + 1),
            codigo_produto: item.sku || item.id?.substring(0, 10) || `PROD${index}`,
            descricao: item.name,
            cfop: cfop,
            codigo_ncm: ncm,
            unidade_comercial: item.unit || 'UN',
            quantidade_comercial: item.quantity,
            valor_unitario_comercial: item.price,
            valor_bruto: itemTotal,
            unidade_tributavel: item.unit || 'UN',
            quantidade_tributavel: item.quantity,
            valor_unitario_tributavel: item.price,
            icms_origem: origin,
            icms_situacao_tributaria: situation,
            pis_situacao_tributaria: '07',
            cofins_situacao_tributaria: '07',
            inclui_no_total: 1
        };

        // For NFe 55, some tags are stricter
        if (store.nfeCrt === '3') {
            itemPayload.icms_modalidade_base_calculo = '3';
        }

        return itemPayload;
    });

    const payload = {
        cnpj_emitente: cleanDocument(store.cnpj),
        inscricao_estadual_emitente: cleanDocument(store.inscricaoEstadual).padStart(13, '0'),
        logradouro_emitente: store.logradouro || '',
        numero_emitente: store.numero || 'SN',
        bairro_emitente: store.bairro || '',
        municipio_emitente: store.cidade || '',
        uf_emitente: store.uf || '',
        cep_emitente: cleanDocument(store.cep || ''),
        natureza_operacao: sale.naturezaOperacao || store.naturezaOperacao || 'Venda de mercadorias',
        data_emissao: new Date().toISOString(),
        tipo_documento: 1,
        presenca_comprador: 1,
        local_destino: 1,
        finalidade_emissao: 1,
        consumidor_final: (isModel55 && customerCpfCnpj.length === 14) ? 0 : 1, // 1 para CPF ou se for NFCe
        modalidade_frete: '9', // 9 = Sem Frete
        itens: focusItems,
        formas_pagamento: []
    };

    let tPag = '01'; // Default dinheiro
    if (sale.paymentMethod) {
        const methodMap = { 'money': '01', 'credit': '03', 'debit': '04', 'pix': '17', 'store_credit': '99', 'CREDIT_CARD': '03', 'DEBIT_CARD': '04' };
        tPag = methodMap[sale.paymentMethod] || '01';
    }

    // Map payment from structured object if available
    if (sale.payment && sale.payment.payments && sale.payment.payments.length > 0) {
        sale.payment.payments.forEach(p => {
            const methodMap = { 'MONEY': '01', 'CREDIT_CARD': '03', 'DEBIT_CARD': '04', 'PIX': '17', 'VOUCHER': '99' };
            payload.formas_pagamento.push({
                forma_pagamento: methodMap[p.method] || '99',
                valor_pagamento: p.amount
            });
        });
    } else {
        payload.formas_pagamento.push({
            forma_pagamento: tPag,
            valor_pagamento: sale.total
        });
    }

    // Customer/Destinatário Info
    if (customerCpfCnpj.length === 11) {
        payload.nome_destinatario = customerName;
        payload.cpf_destinatario = customerCpfCnpj;
        payload.indicador_inscricao_estadual_destinatario = '9'; // Non-taxpayer
    } else if (customerCpfCnpj.length === 14) {
        payload.nome_destinatario = customerName;
        payload.cnpj_destinatario = customerCpfCnpj;
        payload.indicador_inscricao_estadual_destinatario = '9'; // Change to 1 if you have the IE
    }

    // Add structured address for NFe (Model 55) - Mandatory fields
    const cust = sale.customer || {};
    if (cust.cep || isModel55 || customerCpfCnpj) {
        payload.logradouro_destinatario = (cust.logradouro || cust.address || 'RUA NAO INFORMADA').split(',')[0];
        payload.numero_destinatario = cust.numero || 'SN';
        payload.bairro_destinatario = cust.bairro || 'CENTRO';
        payload.municipio_destinatario = (cust.cidade || cust.municipio || 'SAO PAULO').toUpperCase();
        payload.uf_destinatario = (cust.uf || 'SP').toUpperCase();
        payload.cep_destinatario = cleanDocument(cust.cep || '00000000');
    }

    return payload;
};

export const emitNfce = async (storeId, sale) => {
    try {
        const store = await getStore(storeId);
        if (!store) return { success: false, error: "Loja não encontrada." };
        if (!store.focusToken) return { success: false, error: "Token da Focus NFe não configurado. Acesse as Configurações." };

        const internalRef = sale.id;
        const payload = mapSaleToFocusPayload(store, sale);

        const proxyFocusNfe = httpsCallable(functions, 'proxyFocusNfe');
        const response = await proxyFocusNfe({
            endpoint: `/nfce?ref=${internalRef}`,
            method: 'POST',
            payload: payload,
            token: store.focusToken,
            environment: store.nfeEnvironment,
            cnpj: cleanDocument(store.cnpj)
        });

        const data = response.data?.data || {};
        const isOk = response.data?.ok;

        if (!isOk) {
            return {
                success: false,
                error: data.mensagem || data.codigo || "Erro ao emitir NFC-e",
                details: data.erros || []
            };
        }

        return {
            success: true,
            status: data.status, // "processando_autorizacao"
            referencia: internalRef,
            caminho: data.caminho
        };
    } catch (err) {
        console.error("NFE Emit Error", err);
        return { success: false, error: err.message === "Failed to fetch" ? "Erro de conexão (CORS/Internet). Verifique se a API permite acesso web." : `Erro Sefaz/Focus: ${err.message}` };
    }
};

export const emitNfe55 = async (storeId, sale) => {
    try {
        const store = await getStore(storeId);
        if (!store) return { success: false, error: "Loja não encontrada." };
        if (!store.focusToken) return { success: false, error: "Token da Focus NFe não configurado." };

        const internalRef = sale.id;

        // Force model 55 for payload mapping
        const payload = mapSaleToFocusPayload(store, { ...sale, nfeModel: '55' });

        const proxyFocusNfe = httpsCallable(functions, 'proxyFocusNfe');
        const response = await proxyFocusNfe({
            endpoint: `/nfe?ref=${internalRef}`,
            method: 'POST',
            payload: payload,
            token: store.focusToken,
            environment: store.nfeEnvironment,
            cnpj: cleanDocument(store.cnpj)
        });

        const data = response.data?.data || {};
        const isOk = response.data?.ok;

        if (!isOk) {
            return {
                success: false,
                error: data.mensagem || data.codigo || "Erro ao emitir NF-e",
                details: data.erros || []
            };
        }

        return {
            success: true,
            status: data.status,
            referencia: internalRef
        };
    } catch (err) {
        console.error("NFE 55 Emit Error", err);
        return { success: false, error: err.message === "Failed to fetch" ? "Erro de conexão (CORS/Internet). A API da Focus não permite integração direta do Frontend." : `Erro Sefaz/Focus: ${err.message}` };
    }
};

export const consultNfce = async (storeId, reference) => {
    try {
        const store = await getStore(storeId);
        const proxyFocusNfe = httpsCallable(functions, 'proxyFocusNfe');
        const response = await proxyFocusNfe({
            endpoint: `/nfce/${reference}`,
            method: 'GET',
            token: store.focusToken,
            environment: store.nfeEnvironment,
            cnpj: cleanDocument(store.cnpj)
        });

        const data = response.data?.data || {};
        const isOk = response.data?.ok;

        if (!isOk) return { success: false, error: data.mensagem || "Erro ao consultar NFC-e" };

        return {
            success: true,
            status: data.status,
            xml: data.caminho_xml_nota_fiscal,
            pdf: data.caminho_danfe,
            mensagem_sefaz: data.mensagem_sefaz,
            modelo: data.modelo
        };
    } catch (err) {
        console.error("NFE Consult Error", err);
        return { success: false, error: `Erro na Consulta: ${err.message}` };
    }
};

export const emitAndWaitNfce = async (storeId, sale, maxAttempts = 5) => {
    const emitRes = await emitNfce(storeId, sale);

    if (!emitRes.success) return emitRes;

    await new Promise(r => setTimeout(r, 2000));

    let attempts = 0;
    while (attempts < maxAttempts) {
        const statusRes = await consultNfce(storeId, sale.id);

        if (!statusRes.success) return statusRes;

        if (statusRes.status === "autorizado") {
            return { ...statusRes, success: true };
        }

        if (statusRes.status === "erro_autorizacao" || statusRes.status === "denegado") {
            return { success: false, error: `Rejeição Sefaz: ${statusRes.mensagem_sefaz}` };
        }

        await new Promise(r => setTimeout(r, 1500));
        attempts++;
    }

    return { success: false, error: "Tempo limite de comunicação esgotado (Timeout)." };
};

export const getNfeBackups = async (storeId) => {
    try {
        const store = await getStore(storeId);
        if (!store) return { success: false, error: "Loja não encontrada." };
        if (!store.focusToken) return { success: false, error: "Token da Focus NFe não configurado." };

        const proxyFocusNfe = httpsCallable(functions, 'proxyFocusNfe');
        const response = await proxyFocusNfe({
            endpoint: `/backups`,
            method: 'GET',
            token: store.focusToken,
            environment: store.nfeEnvironment,
            cnpj: cleanDocument(store.cnpj)
        });

        const data = response.data?.data || [];
        const isOk = response.data?.ok;

        if (!isOk) {
            return {
                success: false,
                error: data.mensagem || data.codigo || "Erro ao consultar backups",
                details: data.erros || []
            };
        }

        return {
            success: true,
            backups: Array.isArray(data) ? data : (data.backups || [])
        };
    } catch (err) {
        console.error("NFE Backups Error", err);
        return { success: false, error: `Erro na Consulta de Backups: ${err.message}` };
    }
};
