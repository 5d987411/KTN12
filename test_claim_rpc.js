#!/usr/bin/env node
/**
 * Build and submit P2SH transaction for Deadman Switch contract
 * Uses raw RPC calls via @kcoin/kaspa-web3.js
 * 
 * Usage:
 *   node test_claim_rpc.js <contract_address> <private_key> [recipient]
 *   Or set env variables
 */

const { RpcClient } = require('@kcoin/kaspa-web3.js');
globalThis.WebSocket = require('ws');
const fs = require('fs');

const args = process.argv.slice(2);
const RPC_URL = process.env.RPC_URL || 'ws://localhost:18210';
const CONTRACT_FILE = '/Users/4dsto/ktn12/deadman_compiled.json';
const CONTRACT_ADDRESS = args[0] || process.env.CONTRACT_ADDRESS || '';
const BENEFICIARY_KEY = args[1] || process.env.PRIVATE_KEY || '';
const RECIPIENT = args[2] || process.env.RECIPIENT || '';

if (!CONTRACT_ADDRESS || !BENEFICIARY_KEY) {
    console.log('Usage: node test_claim_rpc.js <contract_address> <private_key> [recipient]');
    console.log('Or set environment variables:');
    console.log('  CONTRACT_ADDRESS=kaspatest:... PRIVATE_KEY=... node test_claim_rpc.js');
    process.exit(1);
}

async function main() {
    console.log('=== Deadman Switch - Claim Transaction ===\n');
    
    const rpc = new RpcClient({ endpoint: RPC_URL });
    await rpc.connect();
    console.log('Connected to RPC!');
    
    // Load contract
    const contract = JSON.parse(fs.readFileSync(CONTRACT_FILE, 'utf8'));
    console.log('Contract:', contract.contract_name);
    console.log('ABI:', contract.abi.map(a => a.name).join(', '));
    
    // Get UTXOs
    console.log('\nFetching UTXOs...');
    const utxos = await rpc.getUtxosByAddresses([CONTRACT_ADDRESS]);
    
    if (!utxos.entries || utxos.entries.length === 0) {
        console.log('No UTXOs found!');
        process.exit(1);
    }
    
    const utxo = utxos.entries[0];
    const amount = BigInt(utxo.utxoEntry.amount);
    console.log('Contract balance:', Number(amount) / 1e8, 'KAS');
    
    // Check age
    const info = await rpc.getBlockDagInfo();
    const utxoDAA = BigInt(utxo.utxoEntry.blockDaaScore);
    const currentDAA = BigInt(info.virtualDaaScore);
    const age = currentDAA - utxoDAA;
    console.log('UTXO age:', age.toString(), 'blocks');
    console.log('Timeout: 600 blocks');
    console.log('Can claim:', age >= 600n ? 'YES' : 'NO');
    
    if (age < 600n) {
        console.log('\nNot ready to claim yet!');
        process.exit(0);
    }
    
    // Get contract script hex
    const contractScriptHex = Buffer.from(contract.script).toString('hex');
    console.log('\nContract script:', contractScriptHex.substring(0, 40) + '...');
    
    // For claim entrypoint (index 1), we need:
    // Signature script: <signature> <selector> <pubkey>
    // But we need to sign first...
    
    console.log('\n--- Building P2SH Transaction ---');
    
    // Use createRawTransaction RPC
    const fee = 1000n;
    const claimAmount = amount - fee;
    
    const inputs = [{
        previousOutpoint: {
            transactionId: utxo.outpoint.transactionId,
            index: utxo.outpoint.index
        },
        signatureScript: '00', // Placeholder - will need proper P2SH unlocking script
        sequence: 0
    }];
    
    const outputs = [{
        address: RECIPIENT,
        amount: claimAmount.toString()
    }];
    
    console.log('Input:', utxo.outpoint.transactionId.substring(0, 20) + '...');
    console.log('Output:', RECIPIENT);
    console.log('Amount:', Number(claimAmount) / 1e8, 'KAS');
    
    // Try to create the transaction
    console.log('\n--- Attempting RPC calls ---');
    
    // Method 1: Try createRawTransaction
    try {
        console.log('1. Trying createRawTransaction...');
        const result = await rpc.sendRpcRequest('createRawTransaction', {
            inputs: inputs,
            outputs: outputs
        });
        console.log('Result:', JSON.stringify(result, null, 2).substring(0, 500));
    } catch (e) {
        console.log('Error:', e.message);
    }
    
    // Method 2: Try to get available methods
    console.log('\n2. Checking available RPC methods...');
    try {
        const result = await rpc.sendRpcRequest('getRawMempool', {});
        console.log('Mempool:', result);
    } catch (e) {
        console.log('Error:', e.message);
    }
    
    // Method 3: Try to sign
    console.log('\n3. Trying signRawTransaction...');
    try {
        const result = await rpc.sendRpcRequest('signRawTransaction', {
            tx: inputs,
            keys: [BENEFICIARY_KEY]
        });
        console.log('Sign result:', result);
    } catch (e) {
        console.log('Error:', e.message);
    }
    
    console.log('\n--- Manual approach needed ---');
    console.log('The SDK needs proper P2SH signing support.');
    console.log('To claim manually:');
    console.log('1. Build unlocking script: <signature> <1 (claim selector)> <beneficiary pubkey>');
    console.log('2. Use submitTransaction RPC');
    
    await rpc.disconnect();
    console.log('\nDone!');
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
