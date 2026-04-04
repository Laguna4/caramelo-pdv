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

const FOCUS_API_PROD = "https://api.focusnfe.com.br/v2";
const FOCUS_API_HOMOLOG = "https://homologacao.focusnfe.com.br/v2";

const getBaseUrl = (environment) => {
    return environment === '1' ? FOCUS_API_PROD : FOCUS_API_HOMOLOG;
};

const getHeaders = (token) => {
    // Focus uses Basic Auth with Token as Username and empty Password
    const authHeader = 'Basic ' + btoa(token + ':');
    return {
        'Content-Type': 'application/json',
        'Authorization': authHeader
    };
};

const cleanDocument = (doc) => {
    if (!doc) return '';
    return doc.replace(/[^\d]/g, '');
};

const mapSaleToFocusPayload = (store, sale) => {
    let customerCpfCnpj = '';
    let customerName = 'Consumidor Final';

    if (sale.cpfCnpj) {
        customerCpfCnpj = cleanDocument(sale.cpfCnpj);
    } else if (sale.customer && sale.customer.cpfCnpj) {
        customerCpfCnpj = cleanDocument(sale.customer.cpfCnpj);
        customerName = sale.customer.name;
    }

    const focusItems = sale.items.map((item, index) => {
        const ncm = item.ncm || '00000000';
        const cfop = item.cfop || '5102';
        const origin = item.origin || '0';

        return {
            numero_item: (index + 1),
            codigo_produto: item.barcode || item.id.substring(0, 10),
            descricao: item.name,
            cfop: cfop,
            unidade_comercial: item.unit || 'UN',
            quantidade_comercial: item.quantity,
            valor_unitario_comercial: item.price,
            unidade_tributavel: item.unit || 'UN',
            quantidade_tributavel: item.quantity,
            valor_unitario_tributavel: item.price,
            icms_origem: origin,
        };
    });

    const isModel55 = sale.nfeModel === '55';

    const payload = {
        natureza_operacao: sale.naturezaOperacao || 'Venda de mercadorias',
        data_emissao: new Date().toISOString(),
        tipo_documento: 1,
        presenca_comprador: 1,
        local_destino: 1,
        finalidade_emissao: 1,
        consumidor_final: isModel55 ? 0 : 1, // 0 for PJ/NFe, 1 for NFCe
        itens: focusItems,
        formas_pagamento: []
    };

    let tPag = '01'; // Default dinheiro
    if (sale.paymentMethod) {
        const methodMap = { 'money': '01', 'credit': '03', 'debit': '04', 'pix': '17', 'store_credit': '99' };
        tPag = methodMap[sale.paymentMethod] || '01';
    }

    payload.formas_pagamento.push({
        forma_pagamento: tPag,
        valor_pagamento: sale.total
    });

    if (customerCpfCnpj && customerCpfCnpj.length >= 11) {
        payload.nome_destinatario = customerName;
        if (customerCpfCnpj.length === 11) {
            payload.cpf_destinatario = customerCpfCnpj;
        } else if (customerCpfCnpj.length === 14) {
            payload.cnpj_destinatario = customerCpfCnpj;
        }

        // Add structured address for NFe (Model 55) or if available
        const cust = sale.customer || {};
        if (cust.cep || isModel55) {
            payload.logradouro_destinatario = cust.logradouro || '';
            payload.numero_destinatario = cust.numero || 'SN';
            payload.complemento_destinatario = cust.complemento || '';
            payload.bairro_destinatario = cust.bairro || '';
            payload.municipio_destinatario = cust.cidade || '';
            payload.uf_destinatario = cust.uf || '';
            payload.cep_destinatario = cleanDocument(cust.cep || '');
        }
    }

    return payload;
};

export const emitNfce = async (storeId, sale) => {
    try {
        const store = await getStore(storeId);
        if (!store) return { success: false, error: "Loja não encontrada." };
        if (!store.focusToken) return { success: false, error: "Token da Focus NFe não configurado. Acesse as Configurações." };

        const baseUrl = getBaseUrl(store.nfeEnvironment);
        const headers = getHeaders(store.focusToken);
        const internalRef = sale.id;
        const payload = mapSaleToFocusPayload(store, sale);

        const response = await fetch(`${baseUrl}/nfce?ref=${internalRef}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
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
        return { success: false, error: "Erro de Comunicação com a Sefaz." };
    }
};

export const emitNfe55 = async (storeId, sale) => {
    try {
        const store = await getStore(storeId);
        if (!store) return { success: false, error: "Loja não encontrada." };
        if (!store.focusToken) return { success: false, error: "Token da Focus NFe não configurado." };

        const baseUrl = getBaseUrl(store.nfeEnvironment);
        const headers = getHeaders(store.focusToken);
        const internalRef = sale.id;

        // Force model 55 for payload mapping
        const payload = mapSaleToFocusPayload(store, { ...sale, nfeModel: '55' });

        const response = await fetch(`${baseUrl}/nfe?ref=${internalRef}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
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
        return { success: false, error: "Erro de Comunicação com a Sefaz." };
    }
};

export const consultNfce = async (storeId, reference) => {
    try {
        const store = await getStore(storeId);
        const baseUrl = getBaseUrl(store.nfeEnvironment);
        const headers = getHeaders(store.focusToken);

        const response = await fetch(`${baseUrl}/nfce/${reference}`, {
            method: 'GET',
            headers: headers
        });

        const data = await response.json();

        if (!response.ok) return { success: false, error: data.mensagem || "Erro ao consultar NFC-e" };

        return {
            success: true,
            status: data.status,
            xml: data.caminho_xml_nota_fiscal,
            pdf: data.caminho_danfe,
            mensagem_sefaz: data.mensagem_sefaz
        };
    } catch (err) {
        console.error("NFE Consult Error", err);
        return { success: false, error: "Erro na Consulta." };
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
