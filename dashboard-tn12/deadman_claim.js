/**
 * Deadman Claim Transaction
 * 
 * Usage:
 *   node deadman_claim.js <contract_address> <beneficiary_private_key>
 * 
 * Or set PRIVATE_KEY env variable:
 *   PRIVATE_KEY=... node deadman_claim.js <contract_address>
 */

const kaspa = require('./node_modules/kaspa');
const fs = require('fs');
const path = require('path');

// Get from command line or environment
const args = process.argv.slice(2);
const CONTRACT_ADDRESS = args[0] || process.env.CONTRACT_ADDRESS || '';
const BENEFICIARY_PRIVATE_KEY = args[1] || process.env.PRIVATE_KEY || '';

if (!CONTRACT_ADDRESS || !BENEFICIARY_PRIVATE_KEY) {
    console.log('Usage: node deadman_claim.js <contract_address> <beneficiary_private_key>');
    console.log('Or set PRIVATE_KEY env variable and run:');
    console.log('  CONTRACT_ADDRESS=kaspatest:... PRIVATE_KEY=... node deadman_claim.js');
    process.exit(1);
}

const CONTRACT_FILE = path.join(__dirname, '../deadman_compiled.json');
const RPC_URL = 'https://api-tn12.kaspa.org';

async function main() {
    console.log('=== Deadman Claim Transaction ===\n');
    
    const { RpcClient } = kaspa;
    const rpc = new RpcClient({
        url: RPC_URL,
        networkId: 'testnet-12'
    });
    
    await rpc.connect();
    console.log('Connected to RPC');
    
    const wasmFactory = await kaspa.WasmFactory();
    const wasm = wasmFactory.get({ networkId: 'testnet-12' });
    await wasm.waitForReady();
    console.log('WASM ready');
    
    const keyPair = wasm.privateKeyFromHex(BENEFICIARY_PRIVATE_KEY);
    const beneficiaryPubKey = keyPair.pubKey();
    console.log('Beneficiary pubkey:', beneficiaryPubKey.toString());
    
    const contractData = JSON.parse(fs.readFileSync(CONTRACT_FILE, 'utf8'));
    const contractScript = contractData.script;
    console.log('Contract script length:', contractScript.length);
    
    console.log('\nFetching UTXOs for contract...');
    const utxos = await rpc.getUtxosByAddresses([CONTRACT_ADDRESS]);
    console.log('Found UTXOs:', utxos.length);
    
    if (utxos.length === 0) {
        console.error('No UTXOs found at contract address!');
        process.exit(1);
    }
    
    const utxo = utxos[0];
    const utxoAmount = BigInt(utxo.utxoEntry.amount);
    console.log('UTXO amount:', Number(utxoAmount) / 1e8, 'KAS');
    
    const fee = BigInt(1000);
    const sendAmount = utxoAmount - fee;
    
    const inputs = [{
        previousOutpoint: {
            transactionId: utxo.outpoint.transactionId,
            index: utxo.outpoint.index
        },
        signatureScript: [], 
        sequence: BigInt(0)
    }];
    
    const outputs = [{
        amount: sendAmount,
        scriptPublicKey: {
            script: [], 
            version: BigInt(0)
        }
    }];
    
    const tx = {
        version: BigInt(0),
        inputs: inputs,
        outputs: outputs,
        lockTime: BigInt(0),
        subnetworkId: '00000000000000000000000000000000000000000000000000000000c0ffee00',
        gas: BigInt(0),
        payload: [],
        verbose: 'false'
    };
    
    console.log('\nTransaction:', JSON.stringify(tx, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
    
    try {
        const result = await rpc.submitTransaction({ transaction: tx });
        console.log('\nTransaction submitted!');
        console.log('TXID:', result.transactionId);
    } catch (err) {
        console.error('Error submitting transaction:', err.message);
    }
    
    await rpc.disconnect();
    wasm.free();
}

main().catch(console.error);
