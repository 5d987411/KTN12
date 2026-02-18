# TN12 Project - Kaspa Testnet 12 Development Environment

## Overview

Kaspa Testnet 12 (Covenant) with integrated dashboard, wallet, miner, and transaction generator.

## Quick Start

```bash
# Start node
./kaspad --testnet --netsuffix=12 --utxoindex --rpclisten-json=127.0.0.1:16210

# Start dashboard
cd dashboard-tn12 && node server.js
# Open http://localhost:3001
```

## Components

| Component | Binary | Purpose |
|-----------|--------|---------|
| Node | `kaspad` | Kaspa TN12 full node |
| Wallet CLI | `target/release/kaspa-wallet-cli` | Simple CLI for balance/send |
| Full Wallet | `target/release/kaspa-wallet` | Full wallet (wRPC) |
| Miner | `kaspa-miner` | CPU miner |
| Tx Generator | `rothschild` | High-TPS transaction generator |
| Dashboard | `dashboard-tn12/` | Web UI (port 3001) |

## Pre-funded Wallets

### Main Wallet (Sender)
- **Private Key:** `2d4e8a0a47218b076b4ce72b6df900dba0cfd774240bf1942e3830578615ac09`
- **Address:** (Use dashboard to load)

### Recipient Wallet
- **Address:** `kaspatest:qztewtux4hsrcekswxcrrfhaez692n44fegr3rd5z3rjm85d2ug8xhp0lzg33`

## Usage

### Check Balance
```bash
./target/release/kaspa-wallet-cli balance <address>
```

### Generate New Wallet
```bash
./target/release/kaspa-wallet-cli generate
```

### Start Mining
```bash
./kaspa-miner --testnet --mining-address <address> -p 16210 -t 2
```

### Start Transaction Generator (Rothschild)
```bash
./rothschild -k <private_key> -a <recipient> -t 1 -s localhost:16210
```

## Dashboard

Access at **http://localhost:3001**

Features:
- 3 wallet inputs with balance display
- Console for interactive commands
- Buttons for: generate, balance, send, miner, rothschild, contracts

## Building from Source

Requires rusty-kaspa tn12 branch:
```bash
git clone --branch tn12 https://github.com/kaspanet/rusty-kaspa.git
cd rusty-kaspa

# Build wallet
cargo build --release -p kaspa-wallet

# Build rothschild  
cargo build --release -p rothschild

# Build miner (from cpuminer repo)
cargo build --release
```

## Documentation

- [TN12_SPEC.md](TN12_SPEC.md) - TN12 specifications
- [SESSION_BACKUP.md](SESSION_BACKUP.md) - Current session backup
- [COMMANDS.md](COMMANDS.md) - CLI commands reference

## Dependencies

- **rusty-kaspa**: https://github.com/kaspanet/rusty-kaspa (tn12 branch)
- **cpuminer**: https://github.com/kaspanet/cpuminer (v0.2.6)

## Known Issues

- `kaspa-wallet-cli generate` produces addresses with incorrect length (58 chars vs 61-63 required). Use pre-funded wallets or external address generation.
