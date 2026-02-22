# KTN12 - Kaspa Testnet 12 Development Environment

## Overview

Kaspa Testnet 12 (Covenant) with integrated dashboard, wallet, miner, and transaction generator.

## Network Ports

| Port | Purpose |
|------|---------|
| **16311** | P2P (node-to-node communication) - required for TN12 |
| **16210** | RPC (miner/wallet connection) |
| **17110** | wRPC (WebSocket RPC, enabled via --rpclisten-borsh) |
| **3001** | Dashboard web UI |

**Important:** TN12 uses dedicated ports (16311 P2P, 16210 RPC) to separate from TN10.

## First-Time Setup

```bash
# 1. Clone this repository
git clone https://github.com/5d987411/KTN12.git
cd KTN12

# 2. Build rusty-kaspa-tn12 (REQUIRED)
git clone --branch tn12 https://github.com/kaspanet/rusty-kaspa.git rusty-kaspa-tn12
cd rusty-kaspa-tn12

# Build kaspad (node)
cargo build --release --bin kaspad

# Build rothschild (transaction generator)
cargo build --release --bin rothschild

cd ..

# 3. Get kaspa-miner (pre-built binary)
# Download from: https://github.com/kaspanet/kaspa-miner/releases
# Place as: ./kaspa-miner
# Or build from: https://github.com/kaspanet/cpuminer

# 4. Configure
cp config.env.example config.env
nano config.env
```

Edit `config.env`:
```bash
RUSTY_KASPA_DIR="$HOME/rusty-kaspa-tn12"  # Path to rusty-kaspa-tn12
MINING_ADDRESS="kaspatest:..."              # Your mining address (REQUIRED)
MINER_THREADS=8                            # Number of miner threads
```

## Quick Start

```bash
# Start node (with wRPC enabled on port 17110)
./start_tn12_kaspad.sh

# Start miner
source config.env
./kaspa-miner --testnet --mining-address $MINING_ADDRESS -p $RPC_PORT -t $MINER_THREADS

# Or mine before sync completes (use --enable-unsynced-mining)
./kaspa-miner --testnet --mining-address $MINING_ADDRESS -p $RPC_PORT -t $MINER_THREADS --enable-unsynced-mining

# Start dashboard
cd dashboard-tn12 && npm install && node server.js
# Open http://localhost:3001
```

## Scripts

| Script | Description |
|--------|-------------|
| `start_tn12_kaspad.sh` | Start kaspad (tn12 build with wRPC on port 17110) |
| `start_rk_node.sh` | Start kaspad (legacy binary) |
| `stop_node.sh` | Stop running kaspad |
| `check_config.sh` | Check configuration |

## Configuration

### config.env

| Variable | Default | Description |
|----------|---------|-------------|
| `RUSTY_KASPA_DIR` | `$HOME/rusty-kaspa-tn12` | Path to rusty-kaspa-tn12 |
| `MINING_ADDRESS` | (none) | **REQUIRED** - Your mining address |
| `MINER_THREAD8 | Number of mining threads |
| `P2PS` | _PORT` | 16311 | P2P port for TN12 |
| `RPC_PORT` | 16210 | RPC port |
| `DASHBOARD_PORT` | 3001 | Dashboard port |

### dashboard-tn12/config.js

Edit paths if your rusty-kaspa-tn12 is in a different location:
```javascript
rustyKaspaDir: getConfig('RUSTY_KASPA_DIR', '/path/to/rusty-kaspa-tn12'),
rothschild: getConfig('ROTHSCHILD_BIN', '/path/to/rusty-kaspa-tn12/target/release/rothschild'),
```

## Components

| Component | Source | Path |
|-----------|--------|------|
| Node | rusty-kaspa-tn12 | `$RUSTY_KASPA_DIR/target/release/kaspad` |
| Rothschild | rusty-kaspa-tn12 | `$RUSTY_KASPA_DIR/target/release/rothschild` |
| Miner | kaspanet/cpuminer | `./kaspa-miner` |
| Dashboard | ktn12 | `./dashboard-tn12/` |

## Official TN12 Commands

From the official documentation:

### Start Node
```bash
cd rusty-kaspa-tn12
cargo run --release --bin kaspad -- --testnet --netsuffix=12 --utxoindex
```

### Generate Wallet
```bash
cd rusty-kaspa-tn12
cargo run --release --bin rothschild
# Output includes private key and address
```

### Start Mining
```bash
# Standard (wait for sync)
kaspa-miner --testnet --mining-address <address> -p 16210 -t 1

# Mine immediately (before sync)
kaspa-miner --testnet --mining-address <address> -p 16210 -t 1 --enable-unsynced-mining
```

### Start Transaction Generator
```bash
# After wallet is funded
cargo run --release --bin rothschild -- --private-key <key> -t 5
# -t 5 = 5 TPS, recommended: 1-100 TPS
```

## Dashboard Features

- 3 wallet inputs with balance display (TKAS for testnet)
- Console for interactive commands
- Send KAS via multiple methods (wRPC recommended)
- Miner control (start/stop/status)
- Transaction generator (Rothschild)
- Contract deployment tools

## Network Info

| Item | Value |
|------|-------|
| Network | Testnet 12 |
| P2P Port | 16311 |
| RPC Port | 16210 |
| wRPC Port | 17110 |
| Dashboard Port | 3001 |
| Data Dir | `~/.kaspa-testnet12` |

## Known Issues

- Default TX fee (~5000 sompi) may be too low for fast confirmation
- Use higher priority fees for faster transaction confirmation

## Building from Source

### Rusty-Kaspa (TN12)
```bash
git clone --branch tn12 https://github.com/kaspanet/rusty-kaspa.git rusty-kaspa-tn12
cd rusty-kaspa-tn12

# Build node
cargo build --release --bin kaspad

# Build rothschild
cargo build --release --bin rothschild
```

### Kaspa-Miner
```bash
git clone https://github.com/kaspanet/cpuminer.git
cd cpuminer
./autogen.sh
./configure
make
# Result: kaspa-miner binary
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   index.html    │────▶│   server.js     │────▶│  wallet-cli.sh  │
│   (Frontend)    │     │   (Node.js)     │     │     (Bash)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  kaspad/rothschild │
                        │   (Rust bins)   │
                        └─────────────────┘
```

Dashboard backend (server.js):
- API endpoints for wallet, balance, send, miner control
- Executes CLI commands via child_process
- Returns JSON to frontend
