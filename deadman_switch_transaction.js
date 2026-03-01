// Full dead‑man‑switch transaction builder for Kaspa Testnet 12
// ------------------------------------------------------------
// Prerequisites (run once):
//   npm install @kcoin/kaspa-web3.js @noble/hashes @noble/secp256k1
// ------------------------------------------------------------

// Use gRPC instead of wRPC (more stable)
const { RPC } = require('/Users/4dsto/kaspa-grpc-node/dist');
const { secp256k1 } = require('@noble/secp256k1');

// ==== Configuration ====
// Replace these placeholders with your actual values before running.
const CONFIG = {
  // Private key in hex (32‑byte). Keep it secret!
  privateKeyHex: '0x190dafc03c70b13cfab2c9d7760936e5f2b359f3efcbfc2a21edb14419d8ebdc',
  // Destination (fallback) address – where the funds go if the switch triggers.
  fallbackAddress: 'kaspatest:qpgwz2khk48z6037tecfmm96maykaqrsqtf5efej99tfk6c2phvkjl0vzzkjd',
  // Amount to move to the fallback address (in nano‑KAS).
  amountNano: 99_000_000_000, // 99 KAS = 99,000,000,000 nano‑KAS (leave some for fee)
  // Optional transaction fee (nano‑KAS).
  feeNano: 1_000,
  // The redeem‑script hash of the dead‑man‑switch contract (hex, without 0x).
  redeemScriptHashHex: 'b4af4898dd4bb54a959179ec86cdf608dc7995d08073c439e04005573217e092',
  // RPC endpoint for TN‑12.
  rpcUrl: 'ws://localhost:18210',
};

// ==== Helper Functions ====
/** Convert a hex string to a Uint8Array (useful for hashing). */
function hexToUint8(hex) {
  if (hex.startsWith('0x')) hex = hex.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Compute a script hash that the wallet RPC expects for P2SH.
 *  In practice you obtain this by:
 *   1. Compiling the .sil contract → get the `redeemScript` field (hex).
 *   2. Compute BLAKE2b‑256 of that script.
 *   3. Hex‑encode the digest.
 *  Here we just pass through the supplied hash; replace with real calculation if needed.
 */
async function computeScriptHash(redeemScriptHex) {
  // The wallet RPC `newScriptPubKeyP2SH` expects the hex of the script hash.
  // If you have the raw hash already, just return it.
  return redeemScriptHex;
}

/** Sign a message with a Schorr (Schnorr) signature using the private key.
 *  Kaspa’s script system uses standard Schnorr signatures.
 *  This function returns a hex‑encoded DER‑encoded signature that can be placed
 *  in the witness.
 */
async function signWithSchnorr(messageHex, privKeyHex) {
  const msg = hexToUint8(messageHex);
  // Compute SHA‑256 of the raw message (Kaspa's message commitment).
  const msgHash = await crypto.subtle.digest('sha-256', msg);
  const msgHashHex = Buffer.from(msgHash).toString('hex');

  // Use @noble/secp256k1 to produce a Schnorr signature.
  // `signSchnorr` returns a DER‑encoded signature.
  const { signature } = await secp256k1.signSchnorr(privKeyHex, msgHashHex);
  return signature; // hex string
}

/** Build the unlocking (witness) script for a P2SH output.
 *  For a simple P2SH that pays to a script, the witness format is:
 *    <signature> <publicKey>
 *  If the script also requires a Schorr signature, you can append it.
 */
async function buildP2SHWitness(privKeyHex, pubKeyHexInput, redeemScriptHashHex) {
  // 1️⃣ Sign the spend script (the redeem script hash).
  const signatureHex = await signWithSchnorr(redeemScriptHashHex, privKeyHex);
  // 2️⃣ Derive the public key that corresponds to privKeyHex.
  const pubKeyHex = await getPublicKeyFromPriv(privKeyHex);
  // 3️⃣ Assemble witness: [<signature>, <pubKey>]
  //    In RPC terms this is passed as an array of strings.
  return [`${signatureHex}`, `${pubKeyHex}`];
}

/** Derive the public key (hex) from a private key using the node RPC.
 *  This avoids needing a separate crypto library.
 */
async function getPublicKeyFromPriv(privKeyHex) {
  const provider = new RpcClient({ endpoint: CONFIG.rpcUrl });
  await provider.connect();
  const result = await provider.sendRpcRequest({
    method: 'publicKeyFromPrivKey',
    params: [privKeyHex],
  });
  return result; // returns hex string
}

// ==== Main execution ====
async function main() {
  const provider = new RpcClient({ endpoint: CONFIG.rpcUrl });
  await provider.connect();

  try {
    // ------------------------------------------------------------
    // 1️⃣ Import the private key into the node's wallet (if not already).
    // ------------------------------------------------------------
    console.log('Importing private key...');
    await provider.sendRpcRequest({
      method: 'importPrivKey',
      params: [CONFIG.privateKeyHex],
    });

    // ------------------------------------------------------------
    // 2️⃣ Derive the public key associated with the private key.
    // ------------------------------------------------------------
    console.log('Deriving public key...');
    const senderPubKeyHex = await getPublicKeyFromPriv(CONFIG.privateKeyHex);
    console.log('Sender pubkey:', senderPubKeyHex);

    // ------------------------------------------------------------
    // 3️⃣ Fetch UTXOs for the sender.
    // ------------------------------------------------------------
    console.log('Fetching UTXOs...');
    const utxosResult = await provider.sendRpcRequest({
      method: 'getUtxosByAddresses',
      params: [[senderPubKeyHex]],
    });
    const utxos = utxosResult.entries || [];
    if (utxos.length === 0) {
      throw new Error('No UTXOs found for the sender address.');
    }
    const selectedUtxo = utxos[0]; // simple selection – adjust as needed
    const inputValue = BigInt(selectedUtxo.utxoEntry.amount);
    console.log(`Selected UTXO: value=${inputValue}nanoKAS`);

    // ------------------------------------------------------------
    // 4️⃣ Build the transaction inputs.
    // ------------------------------------------------------------
    const inputs = [
      {
        previousOutpoint: {
          transactionId: selectedUtxo.outpoint.transactionId,
          index: selectedUtxo.outpoint.index,
        },
        amount: selectedUtxo.utxoEntry.amount.toString(),
      },
    ];

    // ------------------------------------------------------------
    // 5️⃣ Resolve the P2SH scriptPubKey for the dead‑man‑switch contract.
    // ------------------------------------------------------------
    console.log('Computing P2SH scriptPubKey for the dead‑man‑switch...');
    const scriptHash = await computeScriptHash(CONFIG.redeemScriptHashHex);
    const fallbackScriptPubKeyResult = await provider.sendRpcRequest({
      method: 'newScriptPubKeyP2SH',
      params: [[scriptHash]],
    });
    console.log('Fallback scriptPubKey:', fallbackScriptPubKeyResult);

    // ------------------------------------------------------------
    // 6️⃣ Build the outputs array.
    // ------------------------------------------------------------
    const amountNano = BigInt(CONFIG.amountNano);
    const feeNano = BigInt(CONFIG.feeNano);
    const outputs = [
      {
        address: CONFIG.fallbackAddress,
        amount: amountNano.toString(),
      },
      {
        // Change back to the sender (or another address of your choice).
        address: senderPubKeyHex,
        amount: (inputValue - amountNano - feeNano).toString(),
      },
    ];

    // ------------------------------------------------------------
    // 7️⃣ Sign and build the signed transaction.
    // ------------------------------------------------------------
    console.log('Building signed transaction...');
    const rawTxHex = await provider.sendRpcRequest({
      method: 'buildSignedTransaction',
      params: {
        inputs,
        outputs,
        networkId: 12, // TN‑12
        // Optional: you can specify a custom feeRate here.
      },
    });
    console.log('Raw transaction (hex):', rawTxHex);

    // ------------------------------------------------------------
    // 8️⃣ Submit the transaction to the network.
    // ------------------------------------------------------------
    console.log('Submitting transaction...');
    const txId = await provider.sendRpcRequest({
      method: 'submitTransaction',
      params: [rawTxHex],
    });
    console.log(`✅ Transaction submitted – ID: ${txId}`);

    // ------------------------------------------------------------
    // 9️⃣ (Optional) Build the witness/unlocking script for the fallback output.
    // ------------------------------------------------------------
    // If you need the explicit unlocking script (e.g., for debugging or for
    // a custom covenant that expects a Schorr signature), you can do:
    const witness = await buildP2SHWitness(
      CONFIG.privateKeyHex,
      senderPubKeyHex,
      CONFIG.redeemScriptHashHex
    );
    console.log('Example witness (signature, pubkey):', witness);

  } catch (err) {
    console.error('❌ Error during transaction flow:', err);
    // In production you might want retry logic for certain RPC errors.
  } finally {
    await provider.disconnect();
  }
}

// Run the script.
main();