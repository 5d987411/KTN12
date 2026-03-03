(function() {
    if (typeof globalThis === 'undefined') { globalThis = this; }
    if (typeof globalThis.WebSocket === 'undefined') { globalThis.WebSocket = require('isomorphic-ws'); }
})();

const kaspa = require('./node_modules/kaspa');
const fs = require('fs');

const args = process.argv.slice(2);
const CONTRACT_FILE = './silverscript-lang/tests/examples/deadman2.json';
const RPC_URL = 'https://api-tn12.kaspa.org';
const CONTRACT_ADDRESS = args[0] || process.env.CONTRACT_ADDRESS || '';
const PRIVATE_KEY = args[1] || process.env.PRIVATE_KEY || '';

if (!CONTRACT_ADDRESS || !PRIVATE_KEY) {
    console.log('Usage: node test_wasm.js <contract_address> <private_key>');
    console.log('Or set environment variables:');
    console.log('  CONTRACT_ADDRESS=kaspatest:... PRIVATE_KEY=... node test_wasm.js');
    process.exit(1);
}

async function fetchUrl(urlPath) {
    const https = require('https');
    return new Promise((resolve, reject) => {
        const options = { hostname: 'api-tn12.kaspa.org', port: 443, path: urlPath, method: 'GET' };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
        });
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    console.log('Testing Kaspa WASM...');
    
    const { RpcClient } = kaspa;
    const rpc = new RpcClient({ url: RPC_URL, networkId: 'testnet-12' });
    await rpc.connect();
    console.log('Connected');
    
    const wasmFactory = await kaspa.WasmFactory();
    const wasm = wasmFactory.get({ networkId: 'testnet-12' });
    await wasm.waitForReady();
    console.log('WASM ready');
    
    const keyPair = wasm.privateKeyFromHex(PRIVATE_KEY);
    console.log('Pubkey:', keyPair.pubKey().toString());
    
    wasm.free();
    await rpc.disconnect();
}

main().catch(e => console.error('Error:', e.message));
