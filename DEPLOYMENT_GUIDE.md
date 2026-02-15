# Kaspa Testnet 12 Deployment Guide

This guide explains how to deploy Silverscript smart contracts to Kaspa Testnet 12.

## Overview

**Silverscript** compiles high-level smart contracts to Kaspa script bytecode. To deploy these contracts, you need:

1. **Kaspad** - Kaspa node (Testnet 12)
2. **Rothschild** - Wallet and transaction generator
3. **Testnet KAS** - Coins from faucet or mining
4. **Compiled Contract** - JSON output from silverc

## Quick Start

### Step 1: Setup Environment

```bash
cd /home/cliff/silverscript
./setup_deployment.sh
```

This will:
- Check/build kaspad and rothschild binaries
- Generate a wallet
- Show funding instructions

### Step 2: Start Kaspa Node

```bash
cd /home/cliff/rusty-kaspa
./target/release/kaspad --testnet --netsuffix=12 --utxoindex --ram-scale=0.5
```

Wait for the node to sync. Check logs for "Processed" messages indicating block sync.

### Step 3: Get Testnet Coins

**Option A: Faucet (Easiest)**
1. Visit: https://faucet-tn12.kaspanet.io
2. Enter your wallet address (from setup script)
3. Request coins

**Option B: Discord**
1. Join: https://discord.gg/kaspa
2. Go to #testnet channel
3. Request coins from community

**Option C: Mine**
```bash
# Download miner from https://github.com/kaspanet/cpuminer/releases
kaspa-miner --testnet --mining-address <your-address> -p 16210 -t 1
```

### Step 4: Deploy Contract

```bash
cd /home/cliff/silverscript
./deploy_contract.sh p2pkh <your-private-key>
```

Available contracts:
- `p2pkh` - Pay-to-Public-Key-Hash (45 bytes)
- `transfer_with_timeout` - Time-locked transfer (108 bytes)
- `escrow` - Arbiter-based escrow (~100 bytes)
- `mecenas` - Recurring payments (~200 bytes)
- `hodl_vault` - Oracle-based vault (162 bytes)
- `bar` - Multi-function contract (~50 bytes)

## Manual Deployment

### Understanding Contract Output

The silverc compiler produces JSON with:
```json
{
  "contract_name": "P2PKH",
  "script": [81, 121, 170, ...],  // Bytecode
  "abi": [
    {
      "name": "spend",
      "inputs": [
        {"name": "pk", "type_name": "pubkey"},
        {"name": "s", "type_name": "sig"}
      ]
    }
  ]
}
```

### Deployment Process

1. **Create P2SH Output**
   - Hash the compiled script with BLAKE2b
   - Create P2SH locking script: `version + OP_BLAKE2B + <hash> + OP_EQUAL`

2. **Build Transaction**
   - Input: Your funded UTXO
   - Output: P2SH contract with minimum dust amount (100000 sompi)
   - Fee: Standard Kaspa fee

3. **Spend from Contract**
   - ScriptSig: `<arguments> <compiled-script>`
   - Arguments must match entrypoint ABI
   - Include function selector for multi-entrypoint contracts

### Example: Deploy P2PKH

```rust
// Using rusty-kaspa SDK
use kaspa_txscript::{pay_to_script_hash_script, ScriptBuilder};
use kaspa_consensus_core::tx::{Transaction, TransactionInput, TransactionOutput};

// 1. Load compiled contract
let contract_json = fs::read_to_string("p2pkh.json")?;
let contract: serde_json::Value = serde_json::from_str(&contract_json)?;
let script_bytes: Vec<u8> = contract["script"].as_array()
    .unwrap()
    .iter()
    .map(|v| v.as_u64().unwrap() as u8)
    .collect();

// 2. Create P2SH output
let p2sh_script = pay_to_script_hash_script(&script_bytes);
let output = TransactionOutput::new(100000, p2sh_script); // dust amount

// 3. Build and sign transaction
// ... use your wallet to sign input ...

// 4. Submit via RPC
// rpc_client.submit_transaction(transaction).await?;
```

### Example: Spend from P2PKH

```rust
// Build unlocking script
let mut sig_script = ScriptBuilder::new();
sig_script.add_data(&public_key)?;  // pubkey
sig_script.add_data(&signature)?;    // signature
sig_script.add_data(&script_bytes)?; // compiled contract (redeem script)

// For multi-entrypoint contracts, add selector:
// sig_script.add_i64(selector_index)?;
```

## Contract Examples

### 1. P2PKH (Pay to Public Key Hash)

**Contract:**
```javascript
pragma silverscript ^0.1.0;

contract P2PKH(bytes32 pkh) {
    entrypoint function spend(pubkey pk, sig s) {
        require(blake2b(pk) == pkh);
        require(checkSig(s, pk));
    }
}
```

**Constructor Args:**
```json
[{"kind": "bytes", "data": [32 bytes of pkh]}]
```

**Usage:**
- Anyone with the private key matching `pkh` can spend
- Standard pay-to-pubkey-hash pattern

### 2. Transfer With Timeout

**Contract:**
```javascript
pragma silverscript ^0.1.0;

contract TransferWithTimeout(
    pubkey sender,
    pubkey recipient,
    int timeout
) {
    entrypoint function transfer(sig recipientSig) {
        require(checkSig(recipientSig, recipient));
    }

    entrypoint function timeout(sig senderSig) {
        require(checkSig(senderSig, sender));
        require(tx.time >= timeout);
    }
}
```

**Constructor Args:**
```json
[
  {"kind": "bytes", "data": [sender_pubkey]},
  {"kind": "bytes", "data": [recipient_pubkey]},
  {"kind": "int", "data": 1700000000}
]
```

**Usage:**
- Recipient can spend immediately with `transfer()`
- Sender can reclaim with `timeout()` after timestamp

### 3. Mecenas (Recurring Payment)

**Contract:** Recurring payment covenant
**Constructor Args:**
```json
[
  {"kind": "bytes", "data": [recipient_pubkey]},
  {"kind": "bytes", "data": [funder_hash]},
  {"kind": "int", "data": 10000000},  // pledge amount
  {"kind": "int", "data": 86400}       // period (1 day)
]
```

**Usage:**
- `receive()` - Trigger periodic payment after period elapses
- `reclaim()` - Funder can reclaim all funds

### 4. HODL Vault

**Contract:** Time-locked vault with oracle
**Constructor Args:**
```json
[
  {"kind": "bytes", "data": [owner_pubkey]},
  {"kind": "bytes", "data": [oracle_pubkey]},
  {"kind": "int", "data": 100000},    // min block
  {"kind": "int", "data": 50000}       // price target
]
```

**Usage:**
- Requires owner signature + oracle data signature
- Validates block height and price from oracle message

## Troubleshooting

### Node Won't Start
- Check port 16210 (RPC) and 16311 (P2P) are available
- Ensure sufficient disk space (>50GB)
- Try with `--ram-scale=0.5` for lower memory usage

### Can't Connect to Faucet
- Check you're on Testnet 12 (not Testnet 10 or mainnet)
- Verify node is fully synced
- Try Discord #testnet channel

### Contract Deployment Fails
- Ensure you have sufficient balance for fees
- Check constructor arguments match contract parameters
- Verify script size is within limits

### Transaction Rejected
- Check fee calculation (minimum fee per UTXO)
- Ensure proper signature format
- Verify covenant outputs are properly formatted

## Resources

- **Silverscript Repo:** https://github.com/kaspanet/silverscript
- **Rusty-Kaspa Repo:** https://github.com/kaspanet/rusty-kaspa
- **Testnet 12 Docs:** https://github.com/kaspanet/rusty-kaspa/blob/tn12/docs/testnet12.md
- **Kaspa Discord:** https://discord.gg/kaspa (#testnet channel)
- **Faucet:** https://faucet-tn12.kaspanet.io

## Advanced: Covenant SDK

For complex covenants with state transitions, use the Covenant SDK:

```rust
use kaspa_covenant_sdk::CovenantBuilder;

let covenant = CovenantBuilder::new()
    .with_state(state_bytes, action_len)
    .with_state_transition(|builder| {
        // Define state transition logic
        builder.add_op(OpAdd)?
    })
    .verify_output_spk_at(0)
    .build()?;
```

See `/home/cliff/rusty-kaspa/covenants/sdk/src/builder.rs` for examples.

## Security Warning

⚠️ **Testnet 12 Only!**
- These contracts only work on Testnet 12
- Do NOT deploy to mainnet
- Test thoroughly before any production use

## Next Steps

1. ✅ Compile contracts with silverc
2. ✅ Setup Testnet 12 node
3. ⏳ Get testnet coins
4. ⏳ Deploy first contract
5. ⏳ Test spending from contract
6. ⏳ Build custom contracts

Happy coding on Kaspa BlockDAG! 🚀
