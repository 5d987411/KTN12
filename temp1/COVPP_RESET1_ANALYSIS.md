# covpp-reset1 Branch Analysis

## Overview
The `covpp-reset1` branch is the **Covenants++** branch of rusty-kaspa that includes:
- **Testnet 12 support** with `--netsuffix=12`
- **Covenants** (smart contracts with output constraints)
- **ZK Precompiles** (zero-knowledge proof support)
- **Silverscript compatibility**

## Key Files

### 1. Testnet 12 Configuration
**File:** `consensus/core/src/config/params.rs`

```rust
pub const TESTNET12_PARAMS: Params = Params {
    dns_seeders: &[
        "tn12-dnsseed.kas.pa",
        "tn12-dnsseed.kasia.fyi",
    ],
    net: NetworkId::with_suffix(NetworkType::Testnet, 12),
    genesis: TESTNET12_GENESIS,

    // Increased for stark proofs (300KB vs 10KB)
    max_signature_script_len: 300_000,

    // Increased block mass limits
    block_mass_limits: BlockMassLimits { 
        compute: 500_000, 
        storage: 500_000, 
        transient: 1_000_000 
    },

    // CRITICAL: Covenants always enabled on Testnet 12
    covenants_activation: ForkActivation::always(),
    
    // Uses TESTNET_PARAMS as base
    ..TESTNET_PARAMS
};
```

**Key differences from mainnet:**
- 30x larger signature scripts (300KB vs 10KB)
- 2x larger block mass limits
- Covenants ALWAYS active
- Different DNS seeders
- Different genesis block

### 2. Covenant System
**File:** `crypto/txscript/src/covenants.rs`

The covenant system allows scripts to:
- Control which outputs can be created
- Verify state transitions
- Authorize specific spending patterns

```rust
/// Context for covenant execution
pub struct CovenantsContext {
    /// Per-input authority contexts
    pub input_ctxs: HashMap<usize, CovenantInputContext>,

    /// Shared transaction-wide contexts
    pub shared_ctxs: HashMap<Hash, CovenantSharedContext>,
}

impl CovenantsContext {
    /// Get authorized output index for an input
    pub(crate) fn auth_output_index(&self, input_idx: usize, k: usize) 
        -> Result<usize, CovenantsError>
    
    /// Get number of authorized outputs
    pub(crate) fn num_auth_outputs(&self, input_idx: usize) -> usize
    
    /// Build context from transaction
    pub fn from_tx(tx: &impl VerifiableTransaction) 
        -> Result<Self, CovenantsError>
}
```

### 3. Covenant Builder SDK
**File:** `covenants/sdk/src/builder.rs`

Helper for building stateful covenants:

```rust
pub struct CovenantBuilder {
    state: Option<StateDescriptor>,
    targets: Vec<OutputTarget>,
    required_auth_output_count: Option<i64>,
    state_transition: Option<Box<StateTransition>>,
}

impl CovenantBuilder {
    pub fn with_state(mut self, state: Vec<u8>, action_len: usize) -> Self;
    pub fn verify_output_spk_at(mut self, output_index: i64) -> Self;
    pub fn require_authorized_output_count(mut self, count: i64) -> Self;
    pub fn with_state_transition<F>(mut self, transition: F) -> Self;
    pub fn build(self) -> Result<Vec<u8>, CovenantBuilderError>;
}
```

### 4. Network Selection Code
**File:** `consensus/core/src/config/params.rs` (lines 520-530)

```rust
impl From<NetworkId> for Params {
    fn from(value: NetworkId) -> Self {
        match value.network_type {
            NetworkType::Mainnet => MAINNET_PARAMS,
            NetworkType::Testnet => match value.suffix {
                Some(10) => TESTNET_PARAMS,      // Regular testnet
                Some(12) => TESTNET12_PARAMS,    // Testnet 12 (covpp)
                Some(x) => panic!("Testnet suffix {} is not supported", x),
                None => panic!("Testnet suffix not provided"),
            },
            // ...
        }
    }
}
```

## Why Pre-built Binary Failed

The v0.17.1 release binary doesn't include Testnet 12:

```bash
# Release binary (v0.17.1)
./kaspad --testnet --netsuffix=12
# ERROR: Testnet suffix 12 is not supported

# covpp-reset1 branch (what we need)
./kaspad --testnet --netsuffix=12
# SUCCESS: Starts Testnet 12 node
```

## Covenant Opcodes

Testnet 12 adds new opcodes for covenant operations:

- `OP_COVenant` - Covenant operations
- `OP_AuthOutputIdx` - Get authorized output index
- `OP_AuthOutputCount` - Get authorized output count
- `OP_TxOutputSpk` - Get output script public key
- `OP_TxInputScriptSigLen` - Get input script length
- `OP_TxInputScriptSigSubstr` - Extract script signature substring

## ZK Precompiles

**Directory:** `crypto/txscript/src/zk_precompiles/`

Zero-knowledge proof support:
- **Risc0** - RISC-V based ZK proofs
- **Groth16** - Pairing-based ZK proofs

Used for advanced contract features like:
- Private transactions
- Verifiable computation
- State channels

## Branch Comparison

| Feature | master | covpp-reset1 | tn12 |
|---------|--------|--------------|------|
| Testnet 12 | ❌ | ✅ | ✅ |
| Covenants | ❌ | ✅ | ✅ |
| ZK Precompiles | ❌ | ✅ | ✅ |
| Silverscript | ❌ | ✅ | ✅ |
| Max Script Size | 10KB | 300KB | 300KB |
| Block Mass | Normal | 2x | 2x |

## Silverscript Dependency

**Silverscript Cargo.toml:**
```toml
[dependencies]
kaspa-txscript = { git = "https://github.com/kaspanet/rusty-kaspa", 
                   branch = "covpp-reset1" }
```

This is why Silverscript ONLY works with Testnet 12 - it depends on the covenant features from this branch!

## How to Build

```bash
# Clone and checkout correct branch
git clone https://github.com/kaspanet/rusty-kaspa.git
cd rusty-kaspa
git checkout covpp-reset1  # or tn12

# Build (takes ~20 minutes)
cargo build --release --bin kaspad --bin rothschild

# Run Testnet 12 node
./target/release/kaspad --testnet --netsuffix=12 --utxoindex
```

## Summary

covpp-reset1 is the ** bleeding-edge branch** with:
1. ✅ Testnet 12 support
2. ✅ Covenants (smart contracts)
3. ✅ ZK proofs
4. ✅ Silverscript compatibility
5. ✅ 300KB script size limit

**Required for:** Deploying Silverscript contracts

**Not in:** Release binaries (yet)

**Must:** Build from source
