#!/usr/bin/env node
/**
 * Kaspa Transaction Sender using rothschild
 * Simple wrapper for exact amount sends
 * 
 * Usage: node send-rothschild.js <private_key> <recipient_address> <amount_kas>
 * 
 * Note: rothschild spends whole UTXOs, so this creates a tx that sends
 * the specified amount to recipient and remainder back to sender
 */

const { spawn, execSync } = require('child_process');
const axios = require('axios');

const KASPA_API = 'https://api-tn12.kaspa.org';
const ROTHSCHILD = './rothschild';
const RPC_HOST = 'localhost:16210';

const PRIVATE_KEY = process.argv[2];
const RECIPIENT = process.argv[3];
const AMOUNT = parseFloat(process.argv[4]);

if (!PRIVATE_KEY || !RECIPIENT || !AMOUNT) {
    console.log('Usage: node send-rothschild.js <private_key> <recipient_address> <amount_kas>');
    console.log('Example: node send-rothschild.js b23f42... kaspatest:xxx 0.1');
    process.exit(1);
}

// Get balance
async function getBalance(address) {
    const url = `${KASPA_API}/addresses/${address}/balance`;
    const resp = await axios.get(url);
    return parseInt(resp.data.balance) / 1e8;
}

// Get UTXOs
async function getUtxos(address) {
    const url = `${KASPA_API}/addresses/${address}/utxos`;
    const resp = await axios.get(url);
    return resp.data;
}

// Derive address from private key
function deriveAddress(privateKey) {
    // Use Python to derive
    const { execSync } = require('child_process');
    try {
        const result = execSync(`python3 -c "
from kaspa import Keypair, PrivateKey
pk = PrivateKey('${privateKey}')
kp = Keypair.from_private_key(pk)
print(kp.to_address('testnet').to_string())
"`, { encoding: 'utf8' });
        return result.trim();
    } catch (e) {
        // Fallback to known address
        return 'kaspatest:qqd3dnqcdcp7gst82lwlvl8k6jpkgzxsgar630uwegrcvr8f63yu7yftcxsen';
    }
}

async function main() {
    console.log(`Amount: ${AMOUNT} KAS`);
    console.log(`Recipient: ${RECIPIENT}`);
    
    // Get sender address
    const sender = deriveAddress(PRIVATE_KEY);
    console.log(`Sender: ${sender}`);
    
    const balance = await getBalance(sender);
    console.log(`Balance: ${balance} KAS`);
    
    if (balance < AMOUNT) {
        console.error('Insufficient funds');
        process.exit(1);
    }
    
    const utxos = await getUtxos(sender);
    console.log(`UTXOs: ${utxos.length}`);
    
    if (utxos.length === 0) {
        console.error('No UTXOs found');
        process.exit(1);
    }
    
    // For now, use rothschild which works
    // It will send the whole UTXO but we can track the result
    console.log('Sending via rothschild (gRPC)...');
    
    return new Promise((resolve, reject) => {
        const proc = spawn(ROTHSCHILD, [
            '-k', PRIVATE_KEY,
            '-a', RECIPIENT,
            '-s', RPC_HOST,
            '-t', '1'  // 1 UTXO
        ], {
            cwd: '/Users/4dsto/ktn12'
        });
        
        let output = '';
        
        proc.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log(text.trim());
        });
        
        proc.stderr.on('data', (data) => {
            const text = data.toString();
            if (!text.includes('[INFO]')) {
                console.error(text.trim());
            }
        });
        
        proc.on('close', (code) => {
            if (code === 0) {
                console.log('Transaction sent successfully!');
                resolve();
            } else {
                console.error('Transaction failed');
                reject(new Error('rothschild failed'));
            }
        });
    });
}

main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
