import { getStore } from "./dbService";
import { functions } from "./firebase";
import { httpsCallable } from "firebase/functions";

const cleanDocument = (doc) => {
    if (!doc) return '';
    return doc.replace(/[^\d]/g, '');
};

const mapServiceOrderToFocusPayload = (store, order) => {
    const customer = order.customer || {};
    let customerDoc = cleanDocument(customer.cpfCnpj || customer.cpf || customer.cnpj || order.cpfCnpj || '');

    // Combine services description and calculate totals
    let discriminacao = order.items.map(item => `${item.name} (${item.quantity}x R$ ${item.price.toFixed(2)})`).join(' | ');
    if (order.notes) discriminacao += `\nObs: ${order.notes}`;

    const totalValue = order.total || order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    // Assume the first item's CNAE/Code is representative if multiple, or use store defaults
    const firstItem = order.items[0] || {};
    const itemListaServico = firstItem.cnae || store.cnaePadrao || '';
    const codigoTributario = firstItem.codigoServicoMunicipio || store.codigoTributacaoMunicipioPadrao || '';
    const aliquota = firstItem.issRate ? parseFloat(firstItem.issRate) : 0;

    const payload = {
        data_emissao: new Date().toISOString(),
        prestador: {
            cnpj: cleanDocument(store.cnpj),
            inscricao_municipal: cleanDocument(store.inscricaoMunicipal),
            codigo_municipio: store.codigoIbge || '0000000'
        },
        tomador: {
            razao_social: customer.name || 'Consumidor Final',
            // API requires either CPF or CNPJ
            ...(customerDoc.length === 14 ? { cnpj: customerDoc } : { cpf: customerDoc || '00000000000' }),
            endereco: {
                logradouro: (customer.logradouro || customer.address || 'Não Informado').split(',')[0],
                numero: customer.numero || 'SN',
                bairro: customer.bairro || 'Centro',
                codigo_municipio: store.codigoIbge || '0000000', // Assuming same city for now, but ideally collected from customer
                uf: (customer.uf || store.uf || 'SP').toUpperCase(),
                cep: cleanDocument(customer.cep || store.cep || '00000000')
            }
        },
        servico: {
            discriminacao: discriminacao,
            item_lista_servico: itemListaServico,
            codigo_tributario_municipio: codigoTributario,
            valor_servicos: totalValue,
            iss_retido: false,
            ...(aliquota > 0 && { aliquota: aliquota })
        }
    };

    if (customer.email) {
        payload.tomador.email = customer.email;
    }

    return payload;
};

export const emitNfse = async (storeId, serviceOrder) => {
    try {
        const store = await getStore(storeId);
        if (!store) return { success: false, error: "Loja não encontrada." };
        if (!store.focusToken) return { success: false, error: "Token da Focus NFe não configurado." };

        const internalRef = serviceOrder.id;
        const payload = mapServiceOrderToFocusPayload(store, serviceOrder);

        const proxyFocusNfe = httpsCallable(functions, 'proxyFocusNfe');
        const response = await proxyFocusNfe({
            endpoint: `/nfse?ref=${internalRef}`,
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
                error: data.mensagem || data.codigo || "Erro ao emitir NFS-e",
                details: data.erros || []
            };
        }

        return {
            success: true,
            status: data.status,
            referencia: internalRef
        };
    } catch (err) {
        console.error("NFSE Emit Error", err);
        return { success: false, error: `Erro de integração: ${err.message}` };
    }
};

export const consultNfse = async (storeId, reference) => {
    try {
        const store = await getStore(storeId);
        const proxyFocusNfe = httpsCallable(functions, 'proxyFocusNfe');
        const response = await proxyFocusNfe({
            endpoint: `/nfse/${reference}`,
            method: 'GET',
            token: store.focusToken,
            environment: store.nfeEnvironment,
            cnpj: cleanDocument(store.cnpj)
        });

        const data = response.data?.data || {};
        const isOk = response.data?.ok;

        if (!isOk) return { success: false, error: data.mensagem || "Erro ao consultar NFS-e" };

        return {
            success: true,
            status: data.status,
            xml: data.caminho_xml_nota_fiscal,
            pdf: data.caminho_danfe || `/v2/nfse/${reference}/danfse`,
            mensagem_sefaz: data.mensagem_sefaz
        };
    } catch (err) {
        console.error("NFSE Consult Error", err);
        return { success: false, error: `Erro na Consulta: ${err.message}` };
    }
};
