#!/usr/bin/env node
/**
 * Kaspa Transaction Sender using kaspa-web3.js
 * Usage: node send-kas-exact.js <private_key> <recipient_address> <amount_kas>
 */

// Silence the library before loading it
process.stdout.write = () => true;
process.stderr.write = () => true;

globalThis.WebSocket = require('ws');
const { RpcClient, NetworkId, kaspaToSompi, Fees, Generator, Keypair } = require('@kcoin/kaspa-web3.js');

// Restore output for our logging
process.stdout.write = () => true;
process.stderr.write = () => true;

const PRIVATE_KEY = process.argv[2];
const RECIPIENT = process.argv[3];
const AMOUNT = parseFloat(process.argv[4]);

if (!PRIVATE_KEY || !RECIPIENT || !AMOUNT) {
  console.log('Usage: node send-kas-exact.js <private_key> <recipient_address> <amount_kas>');
  console.log('Example: node send-kas-exact.js b23f42... kaspatest:xxx 0.1');
  process.exit(1);
}

const keypair = new Keypair(PRIVATE_KEY);
const sender = keypair.toAddress(NetworkId.Testnet12);

console.error(`Sender: ${sender}`);
console.error(`Recipient: ${RECIPIENT}`);
console.error(`Amount: ${AMOUNT} KAS`);

const rpc = new RpcClient({ endpoint: 'ws://localhost:18210' });

async function main() {
  await rpc.connect();
  console.error('Connected to RPC');
  
  const utxos = await rpc.getUtxosByAddresses(sender);
  console.error(`Found ${utxos.length} UTXOs`);
  
  if (utxos.length === 0) {
    console.error('No UTXOs found');
    process.exit(1);
  }
  
  const amountSompi = kaspaToSompi(AMOUNT);
  const priorityFees = new Fees(kaspaToSompi(0.0001));
  
  const sendParams = {
    senderAddress: sender,
    recipientAddress: RECIPIENT,
    amount: amountSompi,
    networkId: NetworkId.Testnet12,
    priorityFees
  };
  
  const generator = new Generator(sendParams.toGeneratorSettings(utxos));
  
  let tx;
  while ((tx = generator.generateTransaction())) {
    tx.sign([PRIVATE_KEY]);
    const response = await rpc.submitTransaction({
      transaction: tx.toSubmittableJsonTx(),
      allowOrphan: false
    });
    console.error(`Transaction submitted: ${response.transactionId}`);
  }
  
  const summary = generator.summary();
  console.error(`\nSuccess! Final TX: ${summary.finalTransactionId}`);
  console.log(summary.finalTransactionId);
  
  await rpc.disconnect();
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
