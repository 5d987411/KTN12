// Full dead‑man‑switch transaction builder for Kaspa Testnet 12
// ------------------------------------------------------------
// Prerequisites (run once):
//   npm install @noble/hashes @noble/secp256k1
// ------------------------------------------------------------

// Use gRPC (more stable)
const { RPC } = require('/Users/4dsto/kaspa-grpc-node/dist');
const { secp256k1 } = require('@noble/secp256k1');

// ==== Configuration ====
const CONFIG = {
  privateKeyHex: '190dafc03c70b13cfab2c9d7760936e5f2b359f3efcbfc2a21edb14419d8ebdc',
  fallbackAddress: 'kaspatest:qpgwz2khk48z6037tecfmm96maykaqrsqtf5efej99tfk6c2phvkjl0vzzkjd',
  amountNano: 99_000_000_000,
  feeNano: 1_000,
  redeemScriptHashHex: 'b4af4898dd4bb54a959179ec86cdf608dc7995d08073c439e04005573217e092',
};

// ==== Helper Functions ====
function hexToUint8(hex) {
  if (hex.startsWith('0x')) hex = hex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function uint8ToHex(bytes) {
  return Buffer.from(bytes).toString('hex');
}

// ==== Main execution ====
async function main() {
  const rpc = new RPC({ clientConfig: { host: '127.0.0.1:16210' } });

  rpc.onConnect(async () => {
    console.log('Connected to gRPC!');
    
    try {
      // Get contract UTXO
      const contractAddr = 'kaspatest:pz627jycm49m2j54j9u7epkd7cydc7v46zq883peupqq24ejzlsfy2uw8txp3';
      const utxos = await rpc.getUtxosByAddresses([contractAddr]);
      
      if (utxos.entries.length === 0) {
        console.log('No UTXOs found!');
        rpc.disconnect();
        return;
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
      console.log('Can claim:', age >= 600n ? 'YES' : 'NO');
      
      if (age < 600n) {
        console.log('Not ready to claim yet!');
        rpc.disconnect();
        return;
      }
      
      // Build P2SH transaction
      // For claim entrypoint (selector = 1), we need:
      // <signature> <selector=1> <pubkey>
      
      // Get beneficiary pubkey
      // The beneficiary is the one who can claim - we use their private key
      const privKey = CONFIG.privateKeyHex;
      
      // Build the transaction
      const fee = BigInt(CONFIG.feeNano);
      const claimAmount = amount - fee;
      
      // Create transaction inputs/outputs
      const tx = {
        transaction: {
          version: 0,
          inputs: [{
            previousOutpoint: {
              transactionId: utxo.outpoint.transactionId,
              index: utxo.outpoint.index
            },
            signatureScript: '00', // placeholder
            sequence: 0
          }],
          outputs: [{
            value: claimAmount.toString(),
            scriptPublicKey: {
              version: 0,
              script: '00' // placeholder - will be P2PKH to recipient
            }
          }],
          lockTime: 0,
          subnetworkId: '00000000000000000000000000000000000000000000000000000000c0ffee00',
          gas: '0',
          payload: ''
        },
        allowOrphan: false
      };
      
      console.log('\n--- Transaction ready ---');
      console.log('From:', contractAddr);
      console.log('To:', CONFIG.fallbackAddress);
      console.log('Amount:', Number(claimAmount) / 1e8, 'KAS');
      console.log('Fee:', Number(fee) / 1e8, 'KAS');
      
      // Submit and see what error we get (helps debug)
      console.log('\n--- Testing submit ---');
      try {
        const result = await rpc.submitTransaction(tx);
        console.log('Result:', result);
      } catch(e) {
        console.log('Error (expected):', e.message || e);
      }
      
    } catch(err) {
      console.error('Error:', err.message);
    }
    
    rpc.disconnect();
  });
}

main();
