#!/usr/bin/env node
/**
 * Kaspa Transaction Sender using @kaspa/wallet
 */

const { Wallet, initKaspaFramework } = require('@kaspa/wallet');
const { RPC } = require('@kaspa/grpc-node');

async function sendKas(privateKeyHex, recipientAddress, amountKas) {
  await initKaspaFramework();
  
  const rpc = new RPC({ clientConfig: { host: '127.0.0.1:16210' } });
  const wallet = new Wallet({ rpc, network: 'kaspatest' });
  
  // Set the private key
  await wallet.importPrivateKey(privateKeyHex);
  
  console.log(`Sender: ${wallet.address}`);
  console.log(`Recipient: ${recipientAddress}`);
  console.log(`Amount: ${amountKas} KAS`);
  
  try {
    const amountSompi = Math.round(amountKas * 1e8);
    const response = await wallet.submitTransaction({
      toAddr: recipientAddress,
      amount: amountSompi,
      fee: 1000 // 0.00001 KAS
    });
    
    console.log(`Success! TX: ${response.txid}`);
    return response;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

const args = process.argv.slice(2);
if (args.length < 3) {
  console.log('Usage: node send-kas-wallet.js <private_key> <recipient_address> <amount_kas>');
  process.exit(1);
}

const [privateKey, recipient, amount] = args;
sendKas(privateKey, recipient, parseFloat(amount))
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
