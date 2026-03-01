const kaspa = require('kaspa');
const fs = require('fs');
const path = require('path');

const CONTRACT_ADDRESS = 'kaspatest:ppanzravch4n7jwcc8e29cxy3n64waz4u7f28s8h0ge68l22xl5u6auqv9cuz';
const BENEFICIARY_PRIVATE_KEY = '190dafc03c70b13cfab2c9d7760936e5f2b359f3efcbfc2a21edb14419d8ebdc';
const CONTRACT_FILE = '/Users/4dsto/ktn12/deadman_compiled.json';
const RPC_URL = 'https://api-tn12.kaspa.org';

async function main() {
    console.log('=== Deadman Claim Transaction ===\n');
    
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
    
    const rpc = new kaspa.RpcRPC({ url: RPC_URL });
    
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
    
    const txBuilder = wasm.txBuilder();
    
    txBuilder.addInput({
        previousOutpoint: {
            transactionId: utxo.outpoint.transactionId,
            index: utxo.outpoint.index
        },
        signatureScript: [0], 
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
    
    const fee = BigInt(1000);
    const sendAmount = utxoAmount - fee;
    
    txBuilder.addOutput({
        amount: sendAmount,
        scriptPublicKey: {
            script: [0], 
            version: BigInt(0)
        }
    });
    
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
    
    const redeemScript = contractScript;
    
    const claimArgs = {
        beneficiarySig: keyPair.sign(Buffer.from(redeemScript)).signature
    };
    
    console.log('\n=== Building Claim Transaction ===');
    console.log('Entry point: claim');
    console.log('Arguments:', JSON.stringify(claimArgs, null, 2));
    
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
    
    wasm.free();
}

main().catch(console.error);
