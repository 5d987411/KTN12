#!/usr/bin/env node
/**
 * Kaspa gRPC Transaction Sender
 * Uses gRPC (port 16210) - stable connection
 * 
 * Usage: node send-grpc.js <private_key> <recipient_address> <amount_kas>
 */

const { Client } = require('./node_modules/@kaspa/grpc');
const axios = require('axios');

const KASPA_API = 'https://api-tn12.kaspa.org';
const GRPC_HOST = 'localhost:16210';

const PRIVATE_KEY = process.argv[2];
const RECIPIENT = process.argv[3];
const AMOUNT = parseFloat(process.argv[4]);

if (!PRIVATE_KEY || !RECIPIENT || !AMOUNT) {
    console.log('Usage: node send-grpc.js <private_key> <recipient_address> <amount_kas>');
    console.log('Example: node send-grpc.js b23f42... kaspatest:xxx 0.1');
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

// Build transaction using Python and return hex
async function buildTransaction(privateKey, recipient, amountKas) {
    return new Promise((resolve, reject) => {
        const { spawn } = require('child_process');
        
        const python = spawn('python3', [
            '-c', `
import asyncio
import json
import requests
from kaspa import Keypair, PrivateKey, Address, create_transactions

NETWORK = 'testnet'
KASPA_API = "https://api-tn12.kaspa.org"

async def build():
    amount_sompi = int(${amountKas} * 1e8)
    
    private_key = PrivateKey('${privateKey}')
    keypair = Keypair.from_private_key(private_key)
    sender = keypair.to_address(NETWORK).to_string()
    
    resp = requests.get(f'{KASPA_API}/addresses/{sender}/utxos', timeout=30)
    utxos = resp.json()
    
    if not utxos:
        print(json.dumps({'error': 'No UTXOs'}))
        return
    
    # Try different entry format
    entries = []
    for u in utxos:
        entry = {
            'outpoint': {
                'transactionId': u['outpoint']['transactionId'],
                'index': u['outpoint']['index']
            },
            'signatureScript': u['utxoEntry']['scriptPublicKey']['scriptPublicKey'],
            'amount': int(u['utxoEntry']['amount']),
            'blockDAAScore': int(u['utxoEntry']['blockDaaScore']),
            'address': sender  # Add address field
        }
        entries.append(entry)
    
    outputs = [{'address': '${recipient}', 'amount': amount_sompi}]
    change_addr = Address(sender)
    
    try:
        pending_tx = create_transactions(
            network_id=NETWORK,
            entries=entries,
            change_address=change_addr,
            outputs=outputs,
            priority_fee=1000
        )
        
        if pending_tx:
            pending_tx.sign([private_key])
            tx = pending_tx.tx
            print(json.dumps({
                'sender': sender,
                'tx_hex': tx.hex(),
                'tx_id': str(tx.tx_id())
            }))
        else:
            print(json.dumps({'error': 'Failed to create transaction'}))
    except Exception as e:
        print(json.dumps({'error': str(e)}))

asyncio.run(build())
`
        ]);
        
        let output = '';
        let error = '';
        
        python.stdout.on('data', (data) => { output += data.toString(); });
        python.stderr.on('data', (data) => { error += data.toString(); });
        
        python.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(error || 'Python error'));
            } else {
                try {
                    const result = JSON.parse(output.trim());
                    if (result.error) {
                        reject(new Error(result.error));
                    } else {
                        resolve(result);
                    }
                } catch (e) {
                    reject(new Error('Failed to parse: ' + output));
                }
            }
        });
    });
}

// Submit transaction via gRPC
async function submitTransaction(client, txHex) {
    // Convert hex to raw bytes
    const txBytes = Buffer.from(txHex, 'hex');
    
    const request = {
        transaction: txBytes,
        allowOrphan: false
    };
    
    try {
        const response = await client.call('submitTransactionRequest', request);
        return response;
    } catch (e) {
        console.error('Submit error:', e.message);
        throw e;
    }
}

async function main() {
    console.log(`Recipient: ${RECIPIENT}`);
    console.log(`Amount: ${AMOUNT} KAS`);
    
    const sender = 'kaspatest:qqd3dnqcdcp7gst82lwlvl8k6jpkgzxsgar630uwegrcvr8f63yu7yftcxsen';
    console.log(`Sender: ${sender}`);
    
    const balance = await getBalance(sender);
    console.log(`Balance: ${balance} KAS`);
    
    if (balance < AMOUNT) {
        console.error('Insufficient funds');
        process.exit(1);
    }
    
    // Build transaction
    console.log('Building transaction...');
    try {
        const txResult = await buildTransaction(PRIVATE_KEY, RECIPIENT, AMOUNT);
        console.log(`TX built: ${txResult.tx_id}`);
        
        // Connect to gRPC
        console.log('Connecting to gRPC...');
        const client = new Client(GRPC_HOST);
        client.connect();
        
        await new Promise((resolve) => {
            client.onConnect(resolve);
        });
        console.log('Connected!');
        
        // Submit
        console.log('Submitting transaction...');
        const result = await submitTransaction(client, txResult.tx_hex);
        console.log('Success! Result:', result);
        
        client.close();
        
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
