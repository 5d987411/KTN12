# KTN12 Technical Tests Documentation

## Session Date: March 2026

## Overview
This document tracks all technical tests performed on the KTN12 Kaspa Testnet 12 development environment.

---

## 1. Deadman Switch Contract Tests

### 1.1 deadman2 Contract Creation

**Test:** Created new SilverScript contract `deadman2.sil`

**Location:** `silverscript-lang/tests/examples/deadman2.sil`

**Contract Code:**
```sil
pragma silverscript ^0.1.0;

contract DeadmanSwitch(
    pubkey owner,
    pubkey beneficiary,
    int timeout
) {
    entrypoint function claim(sig ownerSig) {
        require(checkSig(ownerSig, owner));
    }

    entrypoint function release(sig beneficiarySig) {
        require(checkSig(beneficiarySig, beneficiary));
        require(tx.time >= timeout);
    }
}
```

**Result:** ✓ Created successfully

---

### 1.2 Contract Compilation Test

**Test:** Compiled deadman2.sil to deadman2.json

**Command:**
```bash
cd /Users/4dsto/ktn12/silverscript-lang
cargo run --bin silverc -- tests/examples/deadman2.sil -o /Users/4dsto/ktn12/silverscript-lang/tests/examples/deadman2.json --constructor-args /tmp/deadman2_args.json
```

**Result:** ✓ Compiled successfully

---

### 1.3 Unit Test - compiles_deadman2_example_and_verifies

**Test:** Added and ran Rust unit test in `examples_tests.rs`

**Location:** `silverscript-lang/tests/examples_tests.rs`

**Test Functions:**
- `claim()` - Owner can spend anytime with signature
- `release()` - Beneficiary can spend after timeout

**Result:** ✓ All tests pass

---

## 2. WASM SDK Tests

### 2.1 Kaspa Module Loading

**Test:** Load kaspa WASM module

```javascript
const k = require('./node_modules/kaspa');
console.log('kaspa loaded:', Object.keys(k).slice(0,5));
```

**Result:** ✓ Module loads, exports available functions

---

### 2.2 PrivateKey Creation

**Test:** Create PrivateKey from hex string

```javascript
const pk = new k.PrivateKey('190dafc03c70b13cfab2c9d7760936e5f2b359f3efcbfc2a21edb14419d8ebdc');
```

**Result:** ✓ PrivateKey created successfully

---

### 2.3 signScriptHash Function

**Test:** Sign a script hash

```javascript
const sig = k.signScriptHash(scriptHash, pk);
```

**Result:** ✓ Signature generated successfully

**Output:** `41fed5aa08a8478106c1f3a835bb563097367275261b781644c031159f39a61abeef48ea5096aa35debcc860f2f56539f1f9fdcabe1b7ecdfc092d3901f8a7173601`

---

### 2.4 ScriptBuilder Tests

**Test:** Create ScriptBuilder and add data

```javascript
const sb = new k.ScriptBuilder();
sb.addData(signature);
sb.addData(scriptHash);
const script = sb.drain();
```

**Result:** ✗ CRASH - "null pointer passed to rust"

**Issue:** WASM memory management bug in `ScriptBuilder.addData()`

---

### 2.5 WasmFactory Tests

**Test:** Initialize WASM factory

```javascript
const wasmFactory = await kaspa.WasmFactory();
const wasm = wasmFactory.get({ networkId: 'testnet-12' });
await wasm.waitForReady();
```

**Result:** ✗ CRASH - "memory access out of bounds"

**Issue:** WASM memory allocation bug

---

### 2.6 RpcClient Connection

**Test:** Connect to Kaspa RPC

```javascript
const rpc = new RpcClient({ url: 'https://api-tn12.kaspa.org', networkId: 'testnet-12' });
await rpc.connect();
```

**Result:** ✓ Connects successfully

---

## 3. REST API Tests

### 3.1 Get UTXOs

**Test:** Fetch UTXOs for contract address

**Endpoint:** `GET https://api-tn12.kaspa.org/addresses/{address}/utxos`

**Result:** ✓ Returns UTXO array

**Sample Response:**
```json
[{
  "address": "kaspatest:pztr9qdnu4rhmz4rrqszvgxkq9g6aa29z0n5qm07elerl4zz2hc9clv2p4car",
  "outpoint": {
    "transactionId": "ffbe73952b457616b5da8891fa5b1bcac384d630a803620750aa86198c9ea130",
    "index": 0
  },
  "utxoEntry": {
    "amount": "1100000000",
    "scriptPublicKey": { "scriptPublicKey": "aa20963281b3e..." },
    "blockDaaScore": "18406152",
    "isCoinbase": false
  }
}]
```

---

### 3.2 Get Balance

**Test:** Fetch balance for address

**Endpoint:** `GET https://api-tn12.kaspa.org/addresses/{address}/balance`

**Result:** ✓ Returns balance

---

## 4. Dashboard Tests

### 4.1 Deadman2 Contract in UI

**Test:** Add deadman2 to contract dropdown

**Files Modified:**
- `dashboard-tn12/index.html` - Added option to dropdown
- `dashboard-tn12/server.js` - Added contract file mapping

**Result:** ✓ Contract type appears in dropdown

---

### 4.2 Timeout Parameters

**Test:** Add timeout with unit selection (minutes/hours/days/years)

**Files Modified:**
- `dashboard-tn12/index.html` - Added SILVER_CONTRACTS config for deadman2

**Result:** ✓ Timeout fields work correctly

---

### 4.3 Entrypoint Buttons

**Test:** claim/release buttons display correctly

**Result:** ✓ Both buttons appear in Contract Actions section

---

### 4.4 Entrypoint Calling API

**Test:** Call `/api/silver/call` endpoint

**Result:** ✓ Returns contract details (UTXO, selector, contract script)
**Limitation:** Cannot execute transaction due to WASM signing issues

---

## 5. P2SH Transaction Tests

### 5.1 Manual P2SH Script Building

**Test:** Build P2SH unlocking script

**Required Steps:**
1. Sign transaction with `signScriptHash()`
2. Combine signature + selector + contract bytecode
3. Submit transaction

**Result:** ✗ Step 2 fails due to WASM `ScriptBuilder.addData()` crash

---

## 6. Key Findings & Issues

### Issue 1: WASM Memory Issues
- **Symptom:** "memory access out of bounds" when using `WasmFactory()`
- **Symptom:** "null pointer passed to rust" when using `ScriptBuilder.addData()`
- **Impact:** Cannot automatically build/sign P2SH transactions
- **Affected:** Node.js v20.20.0 with kaspa@0.13.0
- **Status:** Open - waiting for fixes in rusty-kaspa

### Issue 2: Missing covenantId Function
- **Symptom:** No `covenantId()` function in WASM SDK
- **Solution:** PR #885 adds this function (pending merge)
- **Status:** In progress by smartgoo

---

## 7. Workarounds

### 7.1 Manual CLI Claim
Users can still claim using CLI scripts:

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key
export CONTRACT_ADDRESS=kaspatest:...

# Run claim script
node deadman2_claim.js $CONTRACT_ADDRESS $PRIVATE_KEY
```

### 7.2 Dashboard Shows Details
Even though automatic execution fails, dashboard shows:
- Contract address
- UTXO details (tx ID, amount)
- Selector (0 for claim, 1 for release)
- Full contract script (for manual tx building)

---

## 8. Test Commands Reference

### Compile Contract
```bash
cd /Users/4dsto/ktn12/silverscript-lang
cargo run --bin silverc -- tests/examples/deadman2.sil -o /tmp/deadman2.json --constructor-args /tmp/deadman2_args.json
```

### Run Rust Tests
```bash
cd /Users/4dsto/ktn12/silverscript-lang
cargo test --test examples_tests compiles_deadman2
```

### Start Dashboard
```bash
cd /Users/4dsto/ktn12/dashboard-tn12
node server.js
```

### Test WASM
```bash
cd /Users/4dsto/ktn12/dashboard-tn12
node test_wasm.js
```

---

## 9. Security Improvements

### Implemented
1. Removed all hardcoded private keys from source files
2. Added `.env.example` template
3. Updated `.gitignore` to exclude `.env` files
4. Scripts now accept keys via CLI args or env vars

### Usage Pattern
```bash
# Via environment variables
PRIVATE_KEY=xxx node deadman_claim.js

# Via command line arguments
node deadman_claim.js <contract_address> <private_key>
```

---

## 10. Related PRs & Issues

- **PR #885:** Add covenant_id computation to WASM SDK (pending)
- **Rusty Kaspa:** WASM memory management issues (open)
- **kaspa npm package:** v0.13.0 has WASM bugs

---

*Document created: March 2026*
*KTN12 Repository: https://github.com/5d987411/KTN12*
