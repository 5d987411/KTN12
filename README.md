# KTN12 - Kaspa Testnet 12 Development Environment

## Overview

Kaspa Testnet 12 (Covenant) with integrated dashboard, wallet, miner, and transaction generator.

## First-Time Setup

```bash
# 1. Clone and enter the project
git clone https://github.com/5d987411/KTN12.git
cd KTN12

# 2. Check configuration (it will guide you)
./check_config.sh

# 3. Edit config.env to set your paths
nano config.env
# Key settings:
#   - RUSTY_KASPA_DIR: where you cloned rusty-kaspa-tn12
#   - MINING_ADDRESS: your Kaspa testnet address (REQUIRED)

# 4. Start the node
./start_tn12_kaspad.sh
```

## Quick Start (After Setup)

```bash
cd KTN12

# Start node
./start_tn12_kaspad.sh

# Start miner (optional)
source config.env
./kaspa-miner --testnet --mining-address $MINING_ADDRESS -p $RPC_PORT -t $MINER_THREADS

# Start dashboard
cd dashboard-tn12 && node server.js
# Open http://localhost:3001
```

## Scripts

| Script | Description |
|--------|-------------|
| `start_tn12_kaspad.sh` | Start kaspad (NEW tn12 build) |
| `start_rk_node.sh` | Start kaspad (old binary) |
| `start_tn12.sh` | Start from rusty-kaspa-tn12 directory |
| `stop_node.sh` | Stop running kaspad |

## Configuration

Before running, edit `config.env` to set your paths:

```bash
# Edit configuration
nano config.env
```

Key settings in `config.env`:
- `RUSTY_KASPA_DIR` - Path to rusty-kaspa-tn12 (default: $HOME/rusty-kaspa-tn12)
- `MINING_ADDRESS` - **REQUIRED** - Your mining address
- `RPC_PORT` - RPC port (default: 16210)
- `MINER_THREADS` - Number of mining threads (default: 2)

For the dashboard, edit `dashboard-tn12/config.js` or set environment variables.

## Components

| Component | Binary | Path |
|-----------|--------|------|
| Node (NEW) | `kaspad` | `/Users/4dsto/rusty-kaspa-tn12/target/release/kaspad` |
| Node (OLD) | `kaspad` | `/Users/4dsto/ktn12/kaspad` |
| Tx Generator | `rothschild` | `/Users/4dsto/ktn12/rothschild` |
| Miner | `kaspa-miner` | `/Users/4dsto/ktn12/kaspa-miner` |
| Dashboard | `dashboard-tn12/` | Web UI (port 3001) |

## Pre-funded Wallets

### Main Wallet (Sender)
- **Private Key:** (this wwill be different on your miner)
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
git clone --branch tn12 https://github.com/kaspanet/rusty-kaspa.git rusty-kaspa-tn12
cd rusty-kaspa-tn12

# Build node
cargo build --release --bin kaspad

# Build rothschild  
cargo build --release --bin rothschild

# Build miner (from cpuminer repo)
cargo build --release
```

## Rusty-Kaspa Location

- **Path:** `/Users/4dsto/rusty-kaspa-tn12`
- **GitHub:** https://github.com/kaspanet/rusty-kaspa/tree/tn12

## Dependencies

- **rusty-kaspa**: https://github.com/kaspanet/rusty-kaspa (tn12 branch)
- **cpuminer**: https://github.com/kaspanet/cpuminer (v0.2.6)

## Network Info

- **Network:** Testnet 12
- **P2P Port:** 16311
- **RPC Port:** 16210
- **Dashboard Port:** 3001
- **Data Dir:** `~/.kaspa-testnet12`

## Known Issues

- `kaspa-wallet-cli generate` produces addresses with incorrect length (58 chars vs 61-63 required). Use pre-funded wallets or external address generation.
