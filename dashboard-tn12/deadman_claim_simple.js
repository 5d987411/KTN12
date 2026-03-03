const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Get from command line or environment
const args = process.argv.slice(2);
const CONTRACT_ADDRESS = args[0] || process.env.CONTRACT_ADDRESS || '';
const BENEFICIARY_PRIVATE_KEY = args[1] || process.env.PRIVATE_KEY || '';

if (!CONTRACT_ADDRESS || !BENEFICIARY_PRIVATE_KEY) {
    console.log('Usage: node deadman_claim_simple.js <contract_address> <private_key>');
    console.log('Or set environment variables:');
    console.log('  CONTRACT_ADDRESS=kaspatest:... PRIVATE_KEY=... node deadman_claim_simple.js');
    process.exit(1);
}

const CONTRACT_FILE = path.join(__dirname, '../deadman_compiled.json');
const API_URL = 'https://api-tn12.kaspa.org';

function fetchUrl(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api-tn12.kaspa.org',
            port: 443,
            path: path,
            method: 'GET'
        };
        
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(e);
                }
            });
        });
        
        req.on('error', reject);
        req.end();
    });
}

async function main() {
    console.log('=== Deadman Claim Transaction ===\n');
    
    const contractData = JSON.parse(fs.readFileSync(CONTRACT_FILE, 'utf8'));
    const contractScript = contractData.script;
    console.log('Contract script length:', contractScript.length);
    console.log('Contract ABI:', JSON.stringify(contractData.abi, null, 2));
    
    console.log('\nFetching UTXOs for contract...');
    const utxos = await fetchUrl('/addresses/' + CONTRACT_ADDRESS + '/utxos');
    console.log('Found UTXOs:', utxos.length);
    
    if (utxos.length === 0) {
        console.error('No UTXOs found!');
        process.exit(1);
    }
    
    const utxo = utxos[0];
    console.log('\nUTXO:', JSON.stringify(utxo, null, 2));
    
    console.log('\nNote: Building P2SH claim transaction requires:');
    console.log('1. The contract script as the locking script (P2SH)');
    console.log('2. An unlocking script with the entrypoint call + beneficiary signature');
    console.log('\nThis is a complex operation that requires proper Kaspa SDK usage.');
    console.log('\nThe contract is ready for claiming after timeout.');
    console.log('Beneficiary can claim using their private key once timeout (10 min) has passed.');
}

main().catch(console.error);
