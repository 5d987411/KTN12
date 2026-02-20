const https = require('https');
const http = require('http');
const { exec } = require('child_process');
const path = require('path');

const config = require('./config.js');

const ROTHschild = config.rothschild;
const KASPAD_LOG = config.kaspadLog;
const MINER_LOG = config.minerLog;
const ROTHschild_LOG = config.rothschildLog;
const RPC_HOST = 'localhost';
const RPC_PORT = config.rpcPort;

// Both rothschild versions
const ROTHSCHILD_SMARTGOO = '/Users/4dsto/smartgoo-rusty-kaspa/target/release/rothschild';
const ROTHSCHILD_RUSTY = '/Users/4dsto/rusty-kaspa-tn12/target/release/rothschild';

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

const KASPA_API = 'https://api-tn12.kaspa.org';
const SOMPI_PER_KAS = 1e8;
const DUST = 1000;

async function getBalance(address) {
    try {
        const data = await fetchUrl(`${KASPA_API}/addresses/${address}/balance`);
        return { balance: parseInt(data.balance) / SOMPI_PER_KAS, pending: parseInt(data.pendingBalance || 0) / SOMPI_PER_KAS };
    } catch(e) {
        return { error: e.message };
    }
}

async function getUTXOs(address) {
    try {
        const data = await fetchUrl(`${KASPA_API}/addresses/${address}/utxos`);
        return data;
    } catch(e) {
        return { error: e.message };
    }
}

async function sendTransaction(privateKey, recipient, amount) {
    // Use send-tx-exact.py for sending with exact amounts
    return new Promise((resolve) => {
        const cmd = `python3 ${config.ktn12Dir}/send-tx-exact.py "${privateKey}" "${recipient}" ${amount}`;
        exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
            console.log('send-tx-exact.py stdout:', stdout);
            console.log('send-tx-exact.py stderr:', stderr);
            if (error) {
                resolve({ error: error.message, stderr: stderr });
                return;
            }
            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch(e) {
                resolve({ error: e.message, output: stdout });
            }
        });
    });
}

function privateKeyToAddress(privateKey) {
    return new Promise((resolve) => {
        // Use rothschild to derive address - run with timeout
        const cmd = `timeout 3s ${ROTHschild} -k ${privateKey} -s ${RPC_HOST}:${RPC_PORT} 2>&1`;
        exec(cmd, { timeout: 5000 }, (error, stdout, stderr) => {
            if (error && !stdout) {
                resolve({ error: error.message });
                return;
            }
            const match = stdout.match(/from address:\s*(\S+)/i);
            if (match) {
                resolve({ address: match[1] });
            } else {
                resolve({ error: 'Could not derive address' });
            }
        });
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
        // Load wallet - get address from private key using rothschild
        if (urlPath === '/api/wallet-load' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { privateKey } = JSON.parse(body);
                if (!privateKey) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'No private key provided' }));
                    return;
                }
                // Run rothschild with timeout, kill after 5 seconds
                const cmd = `timeout 5s ${ROTHschild} -k ${privateKey} -s ${RPC_HOST}:${RPC_PORT} 2>&1`;
                exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
                    console.log('rothschild output:', stdout);
                    console.log('rothschild error:', error);
                    if (error && !stdout) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: error.message, stderr: stderr, stdout: stdout }));
                        return;
                    }
                    const addressMatch = stdout.match(/from address:\s*(\S+)/i);
                    const utxoMatch = stdout.match(/Estimated available UTXOs:\s*(\d+)/i);
                    const avgMatch = stdout.match(/Avg UTXO amount:\s*(\d+)/i);
                    
                    const address = addressMatch ? addressMatch[1] : '';
                    const utxos = utxoMatch ? parseInt(utxoMatch[1]) : 0;
                    const avgUtxo = avgMatch ? parseInt(avgMatch[1]) : 0;
                    const balance = (utxos * avgUtxo) / 1e8;
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        address: address, 
                        balance: balance,
                        utxos: utxos,
                        raw: stdout 
                    }));
                });
            });
            return;
        }

        // Wallet balance using rothschild
        if (urlPath === '/api/wallet-balance' && req.method === 'GET') {
            const privateKey = getQueryParam('privateKey');
            if (!privateKey) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No private key provided' }));
                return;
            }
            exec(ROTHschild + ' -k ' + privateKey + ' -s ' + RPC_HOST + ':' + RPC_PORT, { timeout: 10000 }, (error, stdout, stderr) => {
                if (error) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                    return;
                }
                const utxoMatch = stdout.match(/Estimated available UTXOs:\s*(\d+)/);
                const avgMatch = stdout.match(/Avg UTXO amount:\s*(\d+)/);
                const addressMatch = stdout.match(/From address:\s*(\S+)/);
                
                const utxos = utxoMatch ? parseInt(utxoMatch[1]) : 0;
                const avgUtxo = avgMatch ? parseInt(avgMatch[1]) : 0;
                const address = addressMatch ? addressMatch[1] : '';
                const balance = (utxos * avgUtxo) / 1e8;
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    balance: balance.toFixed(8),
                    address: address,
                    utxos: utxos,
                    avgUtxo: avgUtxo
                }));
            });
            return;
        }

        // Legacy: Run any CLI command (deprecated - uses rothschild now)
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
                
                // Handle "load <privateKey>" command specially
                if (cmd.startsWith('load ')) {
                    const privateKey = cmd.replace('load ', '').trim();
                    const result = await privateKeyToAddress(privateKey);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                    return;
                }
                
                // Handle "generate" command
                if (cmd === 'generate') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Use external tool to generate wallet' }));
                    return;
                }
                
                // Use rothschild for other commands
                const fullCmd = ROTHschild + ' ' + cmd;
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

        // New Wallet API using Public API
        // Get balance from public API
        if (urlPath === '/api/wallet/balance' && req.method === 'GET') {
            const address = getQueryParam('address');
            if (!address) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Address required' }));
                return;
            }
            const result = await getBalance(address);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }

        // Get UTXOs from public API
        if (urlPath === '/api/wallet/utxos' && req.method === 'GET') {
            const address = getQueryParam('address');
            if (!address) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Address required' }));
                return;
            }
            const result = await getUTXOs(address);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }

        // Derive address from private key
        if (urlPath === '/api/wallet/address' && req.method === 'GET') {
            const privateKey = getQueryParam('privateKey');
            if (!privateKey) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Private key required' }));
                return;
            }
            const result = await privateKeyToAddress(privateKey);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
            return;
        }

        // Send transaction
        if (urlPath === '/api/wallet/send' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                const { privateKey, recipient, amount } = JSON.parse(body);
                if (!privateKey || !recipient || !amount) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'privateKey, recipient, and amount required' }));
                    return;
                }
                
                // First get address from private key
                const addrResult = await privateKeyToAddress(privateKey);
                if (addrResult.error) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: addrResult.error }));
                    return;
                }
                
                // Get balance
                const balance = await getBalance(addrResult.address);
                if (balance.error) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: balance.error }));
                    return;
                }
                
                if (balance.balance < amount) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: `Insufficient balance: ${balance.balance.toFixed(8)} KAS` }));
                    return;
                }
                
                // Send transaction
                const result = await sendTransaction(privateKey, recipient, amount);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            });
            return;
        }

        // Legacy: API proxy for balance (deprecated)
        if (urlPath === '/api/balance' && req.method === 'GET') {
            const address = getQueryParam('address');
            exec(ROTHschild + ' -k <unused> -s ' + RPC_HOST + ':' + RPC_PORT, (error, stdout, stderr) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ balance: '0', note: 'Use /api/wallet-balance with privateKey' }));
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
                const { privateKey, recipient, tps, threads, priorityFee, randomizeFee, version, sendAmount, randomizeTxVersion } = JSON.parse(body);
                
                // Select binary based on version
                const binary = (version === 'smartgoo') ? ROTHSCHILD_SMARTGOO : ROTHSCHILD_RUSTY;
                
                // Kill existing rothschild
                exec('pkill -f "rothschild"', () => {
                    // Build rothschild command with nohup and logging
                    let cmd = 'nohup ' + binary + ' -k ' + privateKey + ' -a ' + recipient + ' -t ' + (tps || 1) + ' -s ' + RPC_HOST + ':' + RPC_PORT;
                    
                    // Add threads if specified
                    if (threads && threads > 0) {
                        cmd += ` --threads ${threads}`;
                    }
                    
                    // Add priority fee if specified
                    if (priorityFee && priorityFee > 0) {
                        cmd += ` --priority-fee ${priorityFee}`;
                    }
                    
                    // Add send-amount if specified (only for rusty-kaspa version)
                    if (sendAmount && sendAmount > 0 && version !== 'smartgoo') {
                        cmd += ` --send-amount ${sendAmount}`;
                    }
                    
                    // Add randomize-fee flag if enabled
                    if (randomizeFee) {
                        cmd += ` --randomize-fee`;
                    }
                    
                    // Add randomize-tx-version flag if enabled (only for rusty-kaspa version)
                    if (randomizeTxVersion && version !== 'smartgoo') {
                        cmd += ` --randomize-tx-version`;
                    }
                    
                    // Add logging to file
                    cmd += ' > ' + ROTHschild_LOG + ' 2>&1 &';
                    
                    exec(cmd, (error, stdout, stderr) => {
                        // Wait a moment then check if running
                        setTimeout(() => {
                            exec('pgrep -f "rothschild"', (err, out) => {
                                const running = out.trim().length > 0;
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ started: running, cmd: cmd, running: running, stdout: stdout, stderr: stderr, version: version || 'rusty-kaspa' }));
                            });
                        }, 1000);
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

        // Start miner
        if (urlPath === '/api/miner-start' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { address, threads } = JSON.parse(body);
                const cmd = `nohup ${config.ktn12Dir}/kaspa-miner --testnet --mining-address ${address} -p ${RPC_PORT} -t ${threads || 8} > ${MINER_LOG} 2>&1 & echo $!`;
                exec(cmd, (error, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ started: true, pid: stdout.trim() }));
                });
            });
            return;
        }

        // Stop miner
        if (urlPath === '/api/miner-stop' && req.method === 'POST') {
            exec('pkill -f "kaspa-miner"', (error, stdout, stderr) => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ stopped: true }));
            });
            return;
        }

        // Compile SilverScript contract
        if (urlPath === '/api/silverscript-compile' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { sourceFile, constructorArgs, outputFile } = JSON.parse(body);
                
                const silverc = path.join(config.ktn12Dir, 'target/release/silverc');
                const sourcePath = path.join(config.ktn12Dir, sourceFile);
                const outputPath = path.join(config.ktn12Dir, outputFile || sourceFile.replace('.sil', '.json'));
                
                let cmd = `${silverc} "${sourcePath}" -o "${outputPath}"`;
                if (constructorArgs) {
                    const argsPath = path.join(config.ktn12Dir, constructorArgs);
                    cmd += ` --constructor-args "${argsPath}"`;
                }
                
                exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    if (error) {
                        res.end(JSON.stringify({ error: stderr || error.message }));
                    } else {
                        // Read and return the compiled output
                        const fs = require('fs');
                        try {
                            const output = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
                            res.end(JSON.stringify({ success: true, output: output }));
                        } catch(e) {
                            res.end(JSON.stringify({ success: true, outputPath: outputPath }));
                        }
                    }
                });
            });
            return;
        }

        // List SilverScript examples
        if (urlPath === '/api/silverscript-examples' && req.method === 'GET') {
            const examplesDir = path.join(config.ktn12Dir, 'silverscript-lang/tests/examples');
            const fs = require('fs');
            exec('ls ' + examplesDir + '/*.sil 2>/dev/null', (error, stdout, stderr) => {
                const files = stdout.trim().split('\n').filter(f => f);
                const examples = files.map(f => {
                    const name = path.basename(f, '.sil');
                    return { name: name, file: 'silverscript-lang/tests/examples/' + path.basename(f) };
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(examples));
            });
            return;
        }

        // Execute shell command
        if (urlPath === '/api/shell' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { cmd, cwd } = JSON.parse(body);
                const workDir = cwd || config.ktn12Dir;
                exec(cmd, { cwd: workDir, timeout: 30000 }, (error, stdout, stderr) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        stdout: stdout, 
                        stderr: stderr,
                        error: error ? error.message : null
                    }));
                });
            });
            return;
        }

        // Get wallet balance via RPC (with fallback)
        if (urlPath === '/api/wallet-balance' && req.method === 'GET') {
            const address = getQueryParam('address');
            if (!address) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Address required' }));
                return;
            }
            
            // Try direct RPC first
            const postData = JSON.stringify({
                jsonrpc: "2.0",
                method: "getBalanceByAddress",
                params: { address: address },
                id: 1
            });
            
            const options = {
                hostname: RPC_HOST,
                port: RPC_PORT,
                path: '/',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData),
                    'Accept': 'application/json'
                }
            };
            
            const req2 = http.request(options, (res2) => {
                let data = '';
                res2.on('data', chunk => data += chunk);
                res2.on('end', () => {
                    try {
                        // Handle empty or binary responses
                        if (!data || data.length === 0) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ balance: '0', note: 'RPC returned empty' }));
                            return;
                        }
                        const result = JSON.parse(data);
                        const balance = (result.result && result.result.balance) ? result.result.balance : '0';
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ balance: balance }));
                    } catch(e) {
                        // Return 0 on parse error - RPC might have issues
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ balance: '0', error: 'RPC unavailable - using default' }));
                    }
                });
            });
            
            req2.on('error', (e) => {
                // Return 0 on connection error - RPC might not be accessible
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ balance: '0', error: 'RPC unavailable' }));
            });
            
            req2.write(postData);
            req2.end();
            return;
        }

        // Send transaction via RPC
        if (urlPath === '/api/send-tx' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                const { privateKey, recipientAddress, amount } = JSON.parse(body);
                
                if (!privateKey || !recipientAddress || !amount) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing parameters' }));
                    return;
                }
                
                const amountSompi = Math.round(parseFloat(amount) * 1e8);
                
                const postData = JSON.stringify({
                    jsonrpc: "2.0",
                    method: "sendTransaction",
                    params: {
                        address: recipientAddress,
                        amount: String(amountSompi),
                        fee: "1000",
                        senderPrivateKey: privateKey
                    },
                    id: 1
                });
                
                const options = {
                    hostname: RPC_HOST,
                    port: RPC_PORT,
                    path: '/',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData),
                        'Accept': 'application/json'
                    }
                };
                
                const req2 = http.request(options, (res2) => {
                    let data = '';
                    res2.on('data', chunk => data += chunk);
                    res2.on('end', () => {
                        try {
                            const result = JSON.parse(data);
                            if (result.error) {
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ error: result.error.message || result.error }));
                            } else {
                                const txId = (result.result && result.result.transactionId) ? result.result.transactionId : result.result;
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({ txId: txId }));
                            }
                        } catch(e) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'RPC unavailable or invalid response' }));
                        }
                    });
                });
                
                req2.on('error', (e) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'RPC unavailable: ' + e.message }));
                });
                
                req2.write(postData);
                req2.end();
            });
            return;
        }

        // Get system info (IP, disk, ktn12 size, chain size)
        if (urlPath === '/api/system-info' && req.method === 'GET') {
            const ktn12Dir = path.join(config.ktn12Dir);
            
            // Get external IP
            exec('curl -s ifconfig.me 2>/dev/null || echo "unknown"', (err1, ip) => {
                ip = ip.trim() || 'unknown';
                
                // Get disk space (available)
                exec('df -h / | tail -1 | awk \'{print $4}\' | tr -d "i"', (err2, hd) => {
                    hd = hd.trim() || 'unknown';
                    
                    // Get ktn12 directory size
                    exec('du -sh ' + ktn12Dir + ' 2>/dev/null | cut -f1 | sed "s/Gi/G/" | sed "s/Mi/M/" | sed "s/Ki/K/"', (err3, ktn12Size) => {
                        ktn12Size = ktn12Size.trim() || 'unknown';
                        
                        // Get chain data size
                        const chainDir = path.join(process.env.HOME || '', '.kaspa-testnet12');
                        exec('du -sh ' + chainDir + ' 2>/dev/null | cut -f1 | sed "s/Gi/G/" | sed "s/Mi/M/" | sed "s/Ki/K/"', (err4, chainSize) => {
                            chainSize = chainSize.trim() || 'unknown';
                            
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ 
                                ip: ip,
                                hd: hd,
                                ktn12Size: ktn12Size,
                                chainSize: chainSize
                            }));
                        });
                    });
                });
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
                    let hashrate = '0.00 M/s';
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
            // First check if rothschild is running
            exec('pgrep -f "rothschild"', (err, out) => {
                const running = out.trim().length > 0;
                
                // Try to get TPS from rothschild log
                exec('tail -50 ' + ROTHschild_LOG + ' 2>/dev/null | grep "Tx rate" | tail -1', (error, stdout, stderr) => {
                    let txTps = 'N/A';
                    const match = stdout.match(/Tx rate:\s*([\d.]+)\/sec/);
                    if (match) txTps = match[1];
                    
                    // If not found in rothschild log, check kaspad log for submit block activity
                    if (txTps === 'N/A' && running) {
                        exec('tail -100 ' + KASPAD_LOG + ' 2>/dev/null | grep "submit block" | wc -l', (err2, count) => {
                            const submitCount = parseInt(count.trim()) || 0;
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ tps: submitCount > 0 ? 'active' : 'N/A', running: running, submitBlocks: submitCount }));
                        });
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ tps: txTps, running: running }));
                    }
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
