const https = require('https');

function testEndpoint(urlStr) {
    return new Promise((resolve) => {
        const url = new URL(urlStr);
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from('dummytoken:').toString('base64')
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        
        req.on('error', (e) => resolve({ error: e.message }));
        req.write(JSON.stringify({}));
        req.end();
    });
}

async function run() {
    console.log("Testing /v2/nfe");
    const nfe = await testEndpoint("https://homologacao.focusnfe.com.br/v2/nfe?ref=123");
    console.log(nfe);

    console.log("Testing /v2/nfe2");
    const nfe2 = await testEndpoint("https://homologacao.focusnfe.com.br/v2/nfe2?ref=123");
    console.log(nfe2);
}

run();
