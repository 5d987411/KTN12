const http = require('http');
const { exec } = require('child_process');

const KGRAF3 = '/Users/4dsto/kgraf3/target/release/kaspa-graffiti-cli';
const API_BASE = 'https://api-tn12.kaspa.org';

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = req.url.split('?')[0];

    try {
        // API proxy for balance
        if (url === '/api/balance' && req.method === 'GET') {
            const address = new URL(req.url, 'http://localhost').searchParams.get('address');
            const response = await fetch(`${API_BASE}/addresses/${address}/balance`);
            const data = await response.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // API proxy for utxos
        if (url === '/api/utxos' && req.method === 'GET') {
            const address = new URL(req.url, 'http://localhost').searchParams.get('address');
            const response = await fetch(`${API_BASE}/addresses/${address}/utxos`);
            const data = await response.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
            return;
        }

        // kgraf3 generate
        if (url === '/api/generate' && req.method === 'POST') {
            const output = await execPromise(`${KGRAF3} generate`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(output);
            return;
        }

        // kgraf3 load
        if (url === '/api/load' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const { privateKey } = JSON.parse(body);
                const output = await execPromise(`${KGRAF3} load ${privateKey}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(output);
            });
            return;
        }

        // kgraf3 transfer
        if (url === '/api/transfer' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const { privateKey, recipient, amount } = JSON.parse(body);
                const output = await execPromise(`${KGRAF3} transfer ${privateKey} ${recipient} ${amount}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(output);
            });
            return;
        }

        // kgraf3 hd-generate
        if (url === '/api/hd-generate' && req.method === 'POST') {
            const output = await execPromise(`${KGRAF3} hd-generate`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(output);
            return;
        }

        // kgraf3 hd-load
        if (url === '/api/hd-load' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const { seed } = JSON.parse(body);
                const output = await execPromise(`${KGRAF3} hd-load ${seed}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(output);
            });
            return;
        }

        // kgraf3 derive-address
        if (url === '/api/derive-address' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const { seed, index } = JSON.parse(body);
                const output = await execPromise(`${KGRAF3} derive-address ${seed} ${index}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(output);
            });
            return;
        }

        // kgraf3 derive-many
        if (url === '/api/derive-many' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const { seed, count } = JSON.parse(body);
                const output = await execPromise(`${KGRAF3} derive-many ${seed} ${count}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(output);
            });
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
    } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
    }
});

function execPromise(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
            if (err) reject(err);
            else resolve(stdout);
        });
    });
}

server.listen(3001, () => console.log('kgraf3 API running on http://localhost:3001'));
