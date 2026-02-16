const https = require('https');
const http = require('http');
const { exec } = require('child_process');

const KGRAF3 = '/Users/4dsto/kgraf3/target/release/kaspa-graffiti-cli';
const RPC_URL = 'https://api-tn12.kaspa.org';
const API_BASE = 'https://api-tn12.kaspa.org';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const urlPath = req.url.split('?')[0];
    const queryString = req.url.split('?')[1] || '';
    const getQueryParam = (name) => {
        const params = queryString.split('&');
        for (const p of params) {
            const [key, val] = p.split('=');
            if (key === name) return decodeURIComponent(val || '');
        }
        return null;
    };

    try {
        // Run any CLI command
        if (urlPath === '/api/run-cmd' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const { cmd } = JSON.parse(body);
                if (!cmd) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No command provided' }));
                    return;
                }
                const fullCmd = KGRAF3 + ' ' + cmd;
                exec(fullCmd, { timeout: 30000 }, (error, stdout, stderr) => {
                    if (error) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: stderr || error.message }));
                        return;
                    }
                    try {
                        const json = JSON.parse(stdout);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(json));
                    } catch (e) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ output: stdout, stderr: stderr }));
                    }
                });
            });
            return;
        }

        // API proxy for balance
        if (urlPath === '/api/balance' && req.method === 'GET') {
            const address = getQueryParam('address');
            const data = await fetchUrl(API_BASE + '/addresses/' + address + '/balance');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // API proxy for utxos
        if (urlPath === '/api/utxos' && req.method === 'GET') {
            const address = getQueryParam('address');
            const data = await fetchUrl(API_BASE + '/addresses/' + address + '/utxos');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
    }
});

server.listen(3001, () => console.log('kgraf3 API running on http://localhost:3001'));
