(function() {
    if (typeof globalThis === 'undefined') { globalThis = this; }
    if (typeof globalThis.WebSocket === 'undefined') { globalThis.WebSocket = require('isomorphic-ws'); }
})();

const kaspa = require('./node_modules/kaspa');
const fs = require('fs');

const CONTRACT_FILE = './silverscript-lang/tests/examples/deadman2.json';
const CONTRACT_ADDRESS = process.argv[2];
const PRIVATE_KEY = process.argv[3];
const RECIPIENT = process.argv[4] || null;
const ENTRYPOINT = process.argv[5] || 'claim';

if (!CONTRACT_ADDRESS || !PRIVATE_KEY) {
    console.log('Usage: node deadman2_claim.js <contract_address> <private_key> [recipient] [entrypoint]');
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
    console.log('=== Deadman2 Claim ===');
    console.log('Contract:', CONTRACT_ADDRESS);
    console.log('Entrypoint:', ENTRYPOINT);
    
    // Connect
    const { RpcClient } = kaspa;
    const rpc = new RpcClient({ url: 'https://api-tn12.kaspa.org', networkId: 'testnet-12' });
    await rpc.connect();
    console.log('Connected to RPC');
    
    // Get WASM
    const wasmFactory = await kaspa.WasmFactory();
    const wasm = wasmFactory.get({ networkId: 'testnet-12' });
    await wasm.waitForReady();
    console.log('WASM ready');
    
    // Load keys
    const keyPair = wasm.privateKeyFromHex(PRIVATE_KEY);
    const pubKey = keyPair.pubKey();
    console.log('Signer pubkey:', pubKey.toString());
    
    // Get recipient address
    let recipient;
    if (RECIPIENT) {
        recipient = wasm.addressFromString(RECIPIENT);
    } else {
        // Default to sender's address
        recipient = wasm.addressFromPubKey(pubKey, 'testnet');
    }
    console.log('Recipient:', recipient.toString());
    
    // Load contract
    const contractData = JSON.parse(fs.readFileSync(CONTRACT_FILE, 'utf8'));
    const contractScript = contractData.script;
    console.log('Contract script:', contractScript.length, 'bytes');
    
    // Get UTXOs
    console.log('\nFetching UTXOs...');
    const utxos = await fetchUrl('/addresses/' + CONTRACT_ADDRESS + '/utxos');
    if (!utxos || utxos.length === 0) {
        console.error('ERROR: No UTXOs!');
        process.exit(1);
    }
    console.log('Found', utxos.length, 'UTXO(s)');
    
    const utxo = utxos[0];
    const utxoAmount = BigInt(utxo.utxoEntry.amount);
    console.log('Amount:', Number(utxoAmount) / 1e8, 'KAS');
    
    // Build transaction
    const txBuilder = wasm.txBuilder();
    
    // Add input
    txBuilder.addInput({
        previousOutpoint: {
            transactionId: utxo.outpoint.transactionId,
            index: utxo.outpoint.index
        },
        signatureScript: contractScript,
        sequence: BigInt(0),
        utxoEntry: {
            amount: utxoAmount,
            blockDAAScore: BigInt(utxo.utxoEntry.blockDaaScore || 0),
            isCoinbase: false,
            scriptPublicKey: {
                script: contractScript,
                version: BigInt(0)
            }
        }
    });
    
    // Add output
    const fee = BigInt(1000);
    const sendAmount = utxoAmount - fee;
    txBuilder.addOutput({
        address: recipient,
        amount: sendAmount
    });
    
    console.log('\nBuilding transaction...');
    
    try {
        const signedTx = txBuilder.build();
        console.log('Transaction built, submitting...');
        
        const result = await rpc.submitTransaction({ transaction: signedTx });
        console.log('\n✓ SUCCESS!');
        console.log('TXID:', result.transactionId);
    } catch(err) {
        console.error('ERROR:', err.message);
    }
    
    wasm.free();
    await rpc.disconnect();
}

main().catch(e => console.error('Error:', e.message));
