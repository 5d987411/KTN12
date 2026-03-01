#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 3003;
const CONFIG_PATH = path.join(__dirname, 'config.json');

let config = {};

function loadConfig() {
    try {
        config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    } catch(e) {
        console.error('Failed to load config:', e.message);
    }
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch(e) {
        console.error('Failed to save config:', e.message);
    }
}

function sendResponse(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

function getConfigValue(obj, path, defaultVal) {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
        if (current && current[part] !== undefined) {
            current = current[part];
        } else {
            return defaultVal;
        }
    }
    return current;
}

function executeClaim(callback) {
    const privateKey = config.owner.privateKey;
    const contractAddress = config.contract.address;
    const beneficiaries = config.beneficiaries || [];
    
    if (!privateKey || !contractAddress) {
        callback({ error: 'Missing privateKey or contractAddress' });
        return;
    }
    
    if (beneficiaries.length === 0) {
        callback({ error: 'No beneficiaries configured' });
        return;
    }
    
    const beneficiary = beneficiaries[0].address;
    console.log('Executing claim: ' + contractAddress + ' -> ' + beneficiary);
    
    const cmd = `kaspa-cli transfer ${privateKey} ${contractAddress} ${beneficiary} --send-all --rpc-url http://localhost:16210`;
    
    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
            console.log('Claim error:', error.message);
            callback({ error: error.message, stdout: stdout, stderr: stderr });
        } else {
            console.log('Claim executed:', stdout);
            callback({ success: true, txid: stdout });
        }
    });
}

async function handleRequest(req, res) {
    const pathname = req.url.split('?')[0];
    
    console.log(new Date().toISOString() + ' ' + req.method + ' ' + pathname);
    
    if (req.method === 'GET' && pathname === '/health') {
        sendResponse(res, 200, { status: 'ok', time: new Date().toISOString() });
        return;
    }
    
    if (req.method === 'GET' && pathname === '/config') {
        loadConfig();
        sendResponse(res, 200, {
            contract: config.contract,
            timing: config.timing,
            hasOwner: !!config.owner.privateKey,
            hasContract: !!config.contract.address
        });
        return;
    }
    
    if (req.method === 'POST' && pathname === '/update') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                loadConfig();
                
                if (data.privateKey) config.owner.privateKey = data.privateKey;
                if (data.ownerAddress) config.owner.address = data.ownerAddress;
                if (data.contractAddress) {
                    config.contract.address = data.contractAddress;
                    config.contract.type = data.contractType || 'DeadmanSwitch';
                    config.contract.deployedAt = new Date().toISOString();
                }
                if (data.beneficiaryAddress) {
                    config.beneficiaries = [{
                        name: 'Primary Beneficiary',
                        address: data.beneficiaryAddress,
                        threshold: 0,
                        notify: true
                    }];
                }
                if (data.timeoutPeriod) config.timing.timeoutPeriod = parseInt(data.timeoutPeriod);
                if (data.gracePeriod) config.timing.gracePeriod = parseInt(data.gracePeriod);
                
                saveConfig();
                
                console.log('Guardian config updated:', config.contract.address);
                sendResponse(res, 200, { success: true, config: config });
            } catch(e) {
                sendResponse(res, 400, { error: e.message });
            }
        });
        return;
    }
    
    if (req.method === 'POST' && pathname === '/heartbeat') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const key = data.key;
                const action = data.action;
                
                loadConfig();
                const heartbeatKey = getConfigValue(config, 'owner.heartbeatKey', 'guardian_heartbeat_key');
                
                if (key !== heartbeatKey) {
                    sendResponse(res, 401, { error: 'Invalid key', received: key, expected: heartbeatKey });
                    return;
                }
                
                if (action === 'status') {
                    const hbPath = path.join(__dirname, 'heartbeat.json');
                    let heartbeat = null;
                    if (fs.existsSync(hbPath)) {
                        heartbeat = JSON.parse(fs.readFileSync(hbPath, 'utf8'));
                    }
                    
                    const now = Date.now();
                    const elapsed = heartbeat ? (now - heartbeat.timestamp) / 1000 : 999999;
                    const timeout = getConfigValue(config, 'timing.timeoutPeriod', 600);
                    const grace = getConfigValue(config, 'timing.gracePeriod', 60);
                    const remaining = Math.max(0, timeout - elapsed);
                    const totalWait = timeout + grace;
                    const isExpired = elapsed > totalWait;
                    
                    sendResponse(res, 200, {
                        status: isExpired ? 'expired' : (remaining > 0 ? 'ok' : 'grace'),
                        lastHeartbeat: (heartbeat && heartbeat.date) || 'never',
                        elapsed: Math.floor(elapsed),
                        remaining: Math.floor(remaining),
                        graceRemaining: Math.floor(Math.max(0, totalWait - elapsed)),
                        timeout: timeout,
                        grace: grace,
                        contract: config.contract.address,
                        hasContract: !!config.contract.address
                    });
                    return;
                }
                
                const heartbeatRec = {
                    key: key,
                    timestamp: Date.now(),
                    date: new Date().toISOString()
                };
                
                fs.writeFileSync(path.join(__dirname, 'heartbeat.json'), JSON.stringify(heartbeatRec, null, 2));
                
                console.log('Heartbeat recorded: ' + heartbeatRec.date);
                sendResponse(res, 200, { success: true, message: 'Heartbeat recorded', timestamp: heartbeatRec.date });
            } catch(e) {
                sendResponse(res, 400, { error: e.message });
            }
        });
        return;
    }
    
    if (req.method === 'POST' && pathname === '/execute') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const key = data.key;
                const dryRun = data.dryRun;
                
                loadConfig();
                const heartbeatKey = getConfigValue(config, 'owner.heartbeatKey', 'guardian_heartbeat_key');
                if (key !== heartbeatKey) {
                    sendResponse(res, 401, { error: 'Invalid key' });
                    return;
                }
                
                const hbPath = path.join(__dirname, 'heartbeat.json');
                let heartbeat = null;
                if (fs.existsSync(hbPath)) {
                    heartbeat = JSON.parse(fs.readFileSync(hbPath, 'utf8'));
                }
                
                const now = Date.now();
                const elapsed = heartbeat ? (now - heartbeat.timestamp) / 1000 : 999999;
                const timeout = getConfigValue(config, 'timing.timeoutCount', 600);
                const grace = getConfigValue(config, 'timing.gracePeriod', 60);
                
                const canExecute = elapsed > (timeout + grace);
                
                if (!canExecute && !dryRun) {
                    sendResponse(res, 400, { 
                        error: 'Cannot execute yet',
                        elapsed: Math.floor(elapsed),
                        required: timeout + grace,
                        remaining: Math.floor(timeout + grace - elapsed)
                    });
                    return;
                }
                
                const result = {
                    wouldExecute: true,
                    elapsed: Math.floor(elapsed),
                    contract: config.contract.address,
                    beneficiaries: getConfigValue(config, 'beneficiaries', []),
                    files: getConfigValue(config, 'files.enabled', false) ? getConfigValue(config, 'files.files', []) : []
                };
                
                if (dryRun) {
                    sendResponse(res, 200, result);
                    return;
                }
                
                console.log('EXECUTING CLAIM...');
                executeClaim((execResult) => {
                    if (execResult.error) {
                        sendResponse(res, 200, { success: false, ...execResult });
                    } else {
                        sendResponse(res, 200, { success: true, ...execResult, ...result });
                    }
                });
            } catch(e) {
                sendResponse(res, 400, { error: e.message });
            }
        });
        return;
    }
    
    sendResponse(res, 404, { error: 'Not found' });
}

loadConfig();

const server = http.createServer(handleRequest);
server.listen(PORT, () => {
    console.log('Guardian API running on http://localhost:' + PORT);
    console.log('Endpoints:');
    console.log('  GET  /config          - Get current config');
    console.log('  POST /update          - Update config');
    console.log('  POST /heartbeat      - Record heartbeat');
    console.log('  POST /execute        - Execute claim');
});
