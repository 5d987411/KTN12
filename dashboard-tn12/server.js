const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const path = require('path');

const config = require('./config.js');

const WALLET_CLI = path.join(config.ktn12Dir, 'target/release/kaspa-wallet-cli');
const ROTHschild = path.join(config.ktn12Dir, 'rothschild');
const KASPAD_LOG = config.kaspadLog;
const MINER_LOG = config.minerLog;
const ROTHschild_LOG = config.rothschildLog;
const RPC_HOST = 'localhost';
const RPC_PORT = config.rpcPort;

const RPC_URL = 'https://api-tn12.kaspa.org';
const API_BASE = 'https://api-tn12.kaspa.org';
const PORT = config.dashboardPort;

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

    // Serve index.html at root
    if (urlPath === '/' || urlPath === '/index.html') {
        const fs = require('fs');
        const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        return;
    }

    const getQueryParam = (name) => {
        const params = queryString.split('&');
        for (const p of params) {
            const [key, val] = p.split('=');
            if (key === name) return decodeURIComponent(val || '');
        }
        return null;
    };

    try {
        // Run any CLI command (kaspa-wallet-cli)
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
                const fullCmd = WALLET_CLI + ' ' + cmd;
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

        // API proxy for balance using local wallet-cli
        if (urlPath === '/api/balance' && req.method === 'GET') {
            const address = getQueryParam('address');
            exec(WALLET_CLI + ' balance ' + address, (error, stdout, stderr) => {
                if (error) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                    return;
                }
                try {
                    const data = JSON.parse(stdout);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(data));
                } catch(e) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ balance: '0', error: stderr || stdout }));
                }
            });
            return;
        }

        // API proxy for utxos
        if (urlPath === '/api/utxos' && req.method === 'GET') {
            const address = getQueryParam('address');
            exec(WALLET_CLI + ' utxos ' + address, (error, stdout, stderr) => {
                if (error) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                    return;
                }
                try {
                    const data = JSON.parse(stdout);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(data));
                } catch(e) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ utxos: [], error: stderr || stdout }));
                }
            });
            return;
        }

        // Send KAS using wallet-cli
        if (urlPath === '/api/send' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { privateKey, recipient, amount } = JSON.parse(body);
                
                const cmd = WALLET_CLI + ' --rpc ' + RPC_HOST + ':' + RPC_PORT + ' send ' + privateKey + ' ' + recipient + ' ' + amount;
                exec(cmd, (error, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    if (error) {
                        res.end(JSON.stringify({ error: error.message, stderr: stderr }));
                    } else {
                        res.end(JSON.stringify({ success: true, stdout: stdout, stderr: stderr }));
                    }
                });
            });
            return;
        }

        // Start rothschild
        if (urlPath === '/api/rothschild' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { privateKey, recipient, tps, amount } = JSON.parse(body);
                
                // Kill existing rothschild
                exec('pkill -f rothschild', () => {
                    // Build rothschild command with optional send amount
                    let cmd = ROTHschild + ' -k ' + privateKey + ' -a ' + recipient + ' -t ' + (tps || 1) + ' -s ' + RPC_HOST + ':' + RPC_PORT;
                    
                    // Add send-amount if specified (amount is in KAS)
                    if (amount && amount > 0) {
                        cmd += ` --send-amount ${amount}`;
                    }
                    
                    exec(cmd, { timeout: 300000 }, (error, stdout, stderr) => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ started: true, cmd: cmd, stdout: stdout, stderr: stderr }));
                    });
                });
            });
            return;
        }

        // Stop rothschild
        if (urlPath === '/api/rothschild-stop' && req.method === 'POST') {
            exec('pkill -f "rothschild"', (error, stdout, stderr) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ stopped: true, stdout: stdout, stderr: stderr }));
            });
            return;
        }

        // Get service status (kaspad, miner, rothschild)
        if (urlPath === '/api/service-status' && req.method === 'GET') {
            exec('pgrep -f "kaspad.*testnet.*netsuffix=12"', (err1, kaspadOut) => {
                const kaspadRunning = kaspadOut.trim().length > 0;
                
                exec('pgrep -f "kaspa-miner"', (err2, minerOut) => {
                    const minerRunning = minerOut.trim().length > 0;
                    
                    exec('pgrep -f "rothschild"', (err3, rothschildOut) => {
                        const rothschildRunning = rothschildOut.trim().length > 0;
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ 
                            kaspad: kaspadRunning ? 'running' : 'stopped',
                            miner: minerRunning ? 'running' : 'stopped',
                            rothschild: rothschildRunning ? 'running' : 'stopped'
                        }));
                    });
                });
            });
            return;
        }

        // Get miner status (hashrate)
        if (urlPath === '/api/miner-status' && req.method === 'GET') {
            // Check if node is syncing UTXO
            exec('tail -50 ' + KASPAD_LOG + ' 2>/dev/null | grep "UTXO set chunks" | tail -1', (utxoErr, utxoOut) => {
                let utxoPercent = '';
                if (utxoOut.includes('UTXO set chunks')) {
                    const utxoMatch = utxoOut.match(/(\d+)\s+UTXOs/);
                    if (utxoMatch) {
                        const utxoCount = parseInt(utxoMatch[1]);
                        // Estimate ~10M UTXOs total for testnet
                        const percent = Math.min(100, Math.round(utxoCount / 100000));
                        utxoPercent = 'UTXO ' + percent + '%';
                    }
                }
                
                exec('tail -50 ' + MINER_LOG + ' 2>/dev/null | grep "hashrate" | tail -1', (error, stdout, stderr) => {
                    let hashrate = 'N/A';
                    const match = stdout.match(/([\d.]+)\s*Mhash\/s/);
                    if (match) hashrate = match[1] + ' M/s';
                    
                    exec('pgrep -f "kaspa-miner"', (err, out) => {
                        const running = out.trim().length > 0;
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ hashrate: hashrate, running: running, utxoSync: utxoPercent }));
                    });
                });
            });
            return;
        }

        // Get node status (TPS)
        if (urlPath === '/api/node-status' && req.method === 'GET') {
            exec('tail -50 ' + KASPAD_LOG + ' 2>/dev/null | grep "IBD.*%" | tail -1', (syncErr, syncOut) => {
                let syncPercent = '';
                const percentMatch = syncOut.match(/(\d+)%/);
                if (percentMatch) syncPercent = percentMatch[1] + '%';
                
                const isSyncing = syncOut.includes('IBD') || syncOut.includes('Processed') && syncOut.includes('headers');
                
                exec('tail -50 ' + KASPAD_LOG + ' 2>/dev/null | grep "Tx throughput" | tail -1', (error, stdout, stderr) => {
                    let tps = 'N/A';
                    const match = stdout.match(/([\d.]+)\s*u-tps/);
                    if (match) tps = match[1];
                    
                    exec('tail -10 ' + KASPAD_LOG + ' 2>/dev/null | grep "Processed" | tail -1', (err, blocks) => {
                        let blockCount = 'N/A';
                        const blockMatch = blocks.match(/Processed\s+(\d+)\s+blocks/);
                        if (blockMatch) blockCount = blockMatch[1];
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ tps: tps, blocks: blockCount, syncing: isSyncing, syncPercent: syncPercent }));
                    });
                });
            });
            return;
        }

        // Get TX status (Rothschild TPS)
        if (urlPath === '/api/tx-status' && req.method === 'GET') {
            exec('tail -50 ' + ROTHschild_LOG + ' 2>/dev/null | grep "Tx rate" | tail -1', (error, stdout, stderr) => {
                let txTps = 'N/A';
                const match = stdout.match(/Tx rate:\s*([\d.]+)\/sec/);
                if (match) txTps = match[1];
                
                exec('pgrep -f "rothschild"', (err, out) => {
                    const running = out.trim().length > 0;
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ tps: txTps, running: running }));
                });
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

server.listen(3001, () => console.log('kgraf3 API running on http://localhost:3001'));
