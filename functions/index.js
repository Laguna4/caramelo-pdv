const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Node 18 natively supports fetch.
exports.proxyFocusNfe = onCall(
    { cors: true }, // Enables CORS for any domain automatically
    async (request) => {
        const data = request.data;
        const { endpoint, method, payload, token, environment, cnpj } = data;

        if (!endpoint || !token) {
            throw new HttpsError("invalid-argument", "Missing endpoint or token");
        }

        const FOCUS_API_PROD = "https://api.focusnfe.com.br/v2";
        const FOCUS_API_HOMOLOG = "https://homologacao.focusnfe.com.br/v2";

        const baseUrl = environment === '1' ? FOCUS_API_PROD : FOCUS_API_HOMOLOG;
        const targetUrl = `${baseUrl}${endpoint}`;

        const authHeader = 'Basic ' + Buffer.from(token + ':').toString('base64');
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': authHeader
        };

        /* 
        if (cnpj) {
            headers['X-Select-Company'] = cnpj;
        }
        */

        const fetchOptions = {
            method: method || 'POST',
            headers: headers
        };

        if (method !== 'GET' && payload) {
            fetchOptions.body = JSON.stringify(payload);
        }

        try {
            logger.info("Calling Focus NFe API", { url: targetUrl, method: fetchOptions.method });
            const response = await fetch(targetUrl, fetchOptions);
            
            let responseData;
            const textResponse = await response.text();
            
            try {
                responseData = textResponse ? JSON.parse(textResponse) : {};
            } catch (e) {
                responseData = { _rawText: textResponse };
            }

            // Return payload wrapping everything
            return {
                ok: response.ok,
                status: response.status,
                data: responseData
            };
        } catch (error) {
            logger.error("Focus NFe API Request Failed:", error.message);
            throw new HttpsError("internal", error.message);
        }
    }
);
