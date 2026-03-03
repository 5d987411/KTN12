(function() {
    if (typeof globalThis === 'undefined') {
        globalThis = this;
    }
    if (typeof globalThis.WebSocket === 'undefined') {
        globalThis.WebSocket = require('isomorphic-ws');
    }
})();

/**
 * Deadman Claim Transaction v2
 * 
 * Usage:
 *   node deadman_claim_v2.js <contract_address> <beneficiary_private_key>
 * 
 * Or set PRIVATE_KEY env variable:
 *   PRIVATE_KEY=... node deadman_claim_v2.js <contract_address>
 */

const kaspa = require('kaspa');
const fs = require('fs');
const path = require('path');

// Get from command line or environment
const args = process.argv.slice(2);
const CONTRACT_ADDRESS = args[0] || process.env.CONTRACT_ADDRESS || '';
const BENEFICIARY_PRIVATE_KEY = args[1] || process.env.PRIVATE_KEY || '';

if (!CONTRACT_ADDRESS || !BENEFICIARY_PRIVATE_KEY) {
    console.log('Usage: node deadman_claim_v2.js <contract_address> <beneficiary_private_key>');
    console.log('Or set PRIVATE_KEY env variable:');
    console.log('  CONTRACT_ADDRESS=kaspatest:... PRIVATE_KEY=... node deadman_claim_v2.js');
    process.exit(1);
}

const CONTRACT_FILE = path.join(__dirname, '../deadman_compiled.json');
const RPC_URL = 'https://api-tn12.kaspa.org';

async function fetchUrl(path) {
    const https = require('https');
    return new Promise((resolve, reject) => {
        const options = { hostname: 'api-tn12.kaspa.org', port: 443, path: path, method: 'GET' };
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
    console.log('=== Deadman Claim Transaction ===\n');
    
    const { RpcClient } = kaspa;
    const rpc = new RpcClient({
        url: RPC_URL,
        networkId: 'testnet-12'
    });
    
    await rpc.connect();
    console.log('Connected to RPC');
    
    const config = { networkId: 'testnet-12' };
    const wasmFactory = await kaspa.WasmFactory();
    const wasm = wasmFactory.get(config);
    await wasm.waitForReady();
    console.log('WASM ready');
    
    const keyPair = wasm.privateKeyFromHex(BENEFICIARY_PRIVATE_KEY);
    const beneficiaryPubKey = keyPair.pubKey();
    console.log('Beneficiary pubkey:', beneficiaryPubKey.toString());
    
    const contractData = JSON.parse(fs.readFileSync(CONTRACT_FILE, 'utf8'));
    const contractScript = contractData.script;
    console.log('Contract script length:', contractScript.length);
    
    console.log('\nFetching UTXOs...');
    const utxos = await fetchUrl('/addresses/' + CONTRACT_ADDRESS + '/utxos');
    console.log('Found UTXOs:', utxos.length);
    
    if (utxos.length === 0) {
        console.error('No UTXOs!');
        process.exit(1);
    }
    
    const utxo = utxos[0];
    const utxoAmount = BigInt(utxo.utxoEntry.amount);
    console.log('UTXO amount:', Number(utxoAmount) / 1e8, 'KAS');
    
    // Get beneficiary P2PK address
    const beneficiaryAddress = wasm.addressFromPubKey(beneficiaryPubKey, 'testnet');
    console.log('Beneficiary address:', beneficiaryAddress.toString());
    
    // Build transaction
    const txBuilder = wasm.txBuilder();
    
    // Add input spending the P2SH UTXO
    txBuilder.addInput({
        previousOutpoint: {
            transactionId: utxo.outpoint.transactionId,
            index: utxo.outpoint.index
        },
        signatureScript: contractScript,  // This is the P2SH redeem script
        sequence: BigInt(0),
        utxoEntry: {
            amount: utxoAmount,
            blockDAAScore: BigInt(utxo.utxoEntry.blockDaaScore),
            isCoinbase: false,
            scriptPublicKey: {
                script: contractScript,
                version: BigInt(0)
            }
        }
    });
    
    // Add output to beneficiary
    const fee = BigInt(1000);
    const sendAmount = utxoAmount - fee;
    txBuilder.addOutput({
        address: beneficiaryAddress,
        amount: sendAmount
    });
    
    // Sign with beneficiary key - this creates the proper unlocking script
    const signedTx = txBuilder.build();
    console.log('\nTransaction built');
    console.log('TX:', JSON.stringify(signedTx, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    
    // Try to submit
    try {
        const result = await rpc.submitTransaction({ transaction: signedTx });
        console.log('\nTransaction submitted!');
        console.log('TXID:', result.transactionId);
    } catch (err) {
        console.error('Error:', err.message);
    }
    
    await rpc.disconnect();
    wasm.free();
}

main().catch(console.error);
