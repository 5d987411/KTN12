#!/usr/bin/env node
/**
 * Deadman Switch - Test Contract Entrypoint Call
 * Uses kaspa-wasm SDK
 * 
 * Usage:
 *   node test_claim.js <contract_address> <owner_key> <beneficiary_key> <recipient>
 *   Or set env variables: PRIVATE_KEY=... node test_claim.js
 */

const kaspa = require('kaspa');

const args = process.argv.slice(2);
const CONTRACT_ADDRESS = args[0] || process.env.CONTRACT_ADDRESS || '';
const OWNER_KEY = args[1] || process.env.OWNER_KEY || process.env.PRIVATE_KEY || '';
const BENEFICIARY_KEY = args[2] || process.env.BENEFICIARY_KEY || '';
const RECIPIENT = args[3] || process.env.RECIPIENT || '';

if (!CONTRACT_ADDRESS || !OWNER_KEY) {
    console.log('Usage: node test_claim.js <contract_address> <owner_key> [beneficiary_key] [recipient]');
    console.log('Or set environment variables:');
    console.log('  CONTRACT_ADDRESS=kaspatest:... OWNER_KEY=... node test_claim.js');
    process.exit(1);
}

async function main() {
    // Create keypairs
    const ownerKp = kaspa.Keypair.fromPrivateKey(new kaspa.PrivateKey(OWNER_KEY));
    const beneficiaryKp = kaspa.Keypair.fromPrivateKey(new kaspa.PrivateKey(BENEFICIARY_KEY));
    
    console.log('Owner pubkey:', ownerKp.publicKey);
    console.log('Beneficiary pubkey:', beneficiaryKp.publicKey);
    
    // Load contract
    const fs = require('fs');
    const contract = JSON.parse(fs.readFileSync('/Users/4dsto/ktn12/deadman_compiled.json', 'utf8'));
    console.log('\nContract:', contract.contract_name);
    console.log('ABI:', contract.abi.map(a => a.name).join(', '));
    console.log('Script:', contract.script.length, 'bytes');
    
    // Connect to RPC
    const rpc = new kaspa.RpcClient({
        url: 'https://api-tn12.kaspa.org',
        network: 'testnet-12'
    });
    
    await rpc.connect();
    console.log('\nConnected to RPC');
    
    // Get UTXOs
    console.log('Fetching UTXOs...');
    const utxos = await rpc.getUtxosByAddresses([CONTRACT_ADDRESS]);
    
    if (!utxos || utxos.length === 0) {
        console.log('No UTXOs found!');
        process.exit(1);
    }
    
    const utxo = utxos[0];
    const amount = BigInt(utxo.utxoEntry.amount);
    console.log('Balance:', Number(amount) / 1e8, 'KAS');
    
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
        await rpc.disconnect();
        process.exit(0);
    }
    
    // Build claim transaction
    console.log('\nBuilding claim transaction...');
    
    const fee = 1000n;
    const claimAmount = amount - fee;
    
    // Create transaction using the inputs from contract
    const tx = kaspa.createTransaction(
        [{
            previousOutpoint: {
                transactionId: utxo.outpoint.transactionId,
                index: utxo.outpoint.index
            },
            signatureScript: [], // Will be filled by SDK
            sequence: 0
        }],
        [{
            address: RECIPIENT,
            amount: claimAmount.toString()
        }],
        {
            changeAddress: RECIPIENT,
            priorityFee: '1000'
        }
    );
    
    console.log('Transaction created');
    console.log('  Inputs:', tx.inputs.length);
    console.log('  Outputs:', tx.outputs.length);
    
    // The SDK needs proper P2SH script building to spend from contract
    // This requires understanding the contract's locking bytecode
    
    console.log('\nNote: P2SH spending from contract requires:');
    console.log('1. Building unlocking script with entrypoint selector');
    console.log('2. Sign with beneficiary key');
    console.log('3. SDK needs contract script execution support');
    
    await rpc.disconnect();
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
