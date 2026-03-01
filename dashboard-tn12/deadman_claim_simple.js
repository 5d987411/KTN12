const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONTRACT_ADDRESS = 'kaspatest:ppanzravch4n7jwcc8e29cxy3n64waz4u7f28s8h0ge68l22xl5u6auqv9cuz';
const BENEFICIARY_PRIVATE_KEY = '190dafc03c70b13cfab2c9d7760936e5f2b359f3efcbfc2a21edb14419d8ebdc';
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
