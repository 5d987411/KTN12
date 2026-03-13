# KTN12 - Kaspa Testnet 12 Development Environment

## Overview

Kaspa Testnet 12 (Covenant) development environment with integrated dashboard, wallet, miner, transaction generator, and smart contract support.

## Technical Specifications

### Network
| Property | Value |
|----------|-------|
| Network | Testnet 12 (Covenant) |
| P2P Port | 16311 |
| RPC Port (gRPC) | 16210 |
| JSON-RPC Port | 18210 |
| Borsh-RPC Port | 17210 |
| Dashboard Port | 3001 |
| Data Directory | `~/.kaspa-testnet12-tn12` |

### Components
| Component | Version | Binary Path |
|-----------|---------|-------------|
| Node | 1.1.0 | `/Users/4dsto/rusty-kaspa/target/release/kaspad` |
| Miner | 0.2.6 | `/Users/4dsto/ktn12/kaspa-miner` |
| Tx Generator | 1.1.0 | rusty-kaspa rothschild |
| Dashboard | Node.js | `dashboard-tn12/server.js` |

### New in v1.1.0 / TN12
- **VSPC API v2** - `get_virtual_chain_from_block_v2` for simplified integrations
- **KIP-16** - ZK Proof Verification (OpZkPrecompile) - coming soon
- **KIP-17** - Native Assets / Covenant IDs - TN12 only
- **10 BPS** - Crescendo hardfork (~2.5 min per block)
- **Covenants++** - Programmable UTXOs enabled
- **Retention Period** - `--retention-period-days` flag

### Dashboard URLs
- **Main Dashboard:** http://localhost:3001
- **Control Panel:** http://localhost:3001/controlpanel.html

### API Endpoints
| Endpoint | Description |
|----------|-------------|
| `/api/service-status` | Kaspad/Miner/Rothschild status |
| `/api Node sync/node-status` |, TPS, blocks |
| `/api/miner-status` | Miner hashrate, accepted/rejected |
| `/api/wallet-load` | Load wallet from private key |
| `/api/wallet/balance` | Get balance |
| `/api/wallet/send` | Send KAS |
| `/api/silver/compile` | Compile SilverScript contract |
| `/api/rpc` | Generic RPC call |
| `/api/shell` | Execute shell command |
| `/api/kaspad/log` | Stream kaspad logs |

---

## First-Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/5d987411/KTN12.git
cd KTN12

# 2. Install Node.js dependencies
cd dashboard-tn12
npm install

# 3. Build rusty-kaspa (if not already built)
git clone --branch tn12 https://github.com/kaspanet/rusty-kaspa.git rusty-kaspa-tn12
cd rusty-kaspa-tn12
cargo build --release --bin kaspad
cargo build --release --bin rothschild

# 4. Configure environment
cd ../..
cp .env.example .env  # For private keys (gitignored)
cp config.env.example config.env  # For settings (gitignored)
nano config.env
# Set RUSTY_KASPA_DIR to your path
# Set MINING_ADDRESS (required for mining)
```

### Environment Variables

Private keys should be set via environment variables (never commit these):

```bash
# .env file (gitignored - DO NOT COMMIT)
PRIVATE_KEY=your_private_key_here
MINING_ADDRESS=your_mining_address
CONTRACT_ADDRESS=your_contract_address

# Or pass via command line when running scripts
PRIVATE_KEY=xxx node deadman_claim.js <contract_address>
```

---

## Quick Start

### Start Node
```bash
cd /Users/4dsto/ktn12
./start_tn12.sh
```

### Start Dashboard
```bash
cd /Users/4dsto/ktn12/dashboard-tn12
node server.js &
# Open http://localhost:3001
```

### Start Miner
```bash
cd /Users/4dsto/ktn12
./kaspa-miner --testnet --mining-address <YOUR_ADDRESS> -p 16210 -t 8
```

### Start Transaction Generator
```bash
./rothschild -k <PRIVATE_KEY> -a <RECIPIENT> -t 1 -s localhost:16210
```

---

## Dashboard Usage

### Main Dashboard (index.html)
- **Wallet A**: Main mining wallet
- **Wallet B**: Secondary wallet  
- **Wallet C**: CLI wallet
- **Commands**: generate, load, balance, send
- **Miner Controls**: Start/Stop/Restart
- **SilverScript**: Compile & Deploy smart contracts
- **RPC Tester**: Direct RPC calls

### Control Panel (controlpanel.html)
Sidebar navigation with:
- **System**: Start/Stop/Restart Kaspad
- **Miner**: Start/Stop/Status
- **Rothschild**: Start/Stop
- **Network**: getInfo, getBlockCount, getPeers, getMempool, etc.
- **Wallet**: Load key, balance, send KAS
- **Contracts**: SilverScript compile, Guardian config
- **RPC Tester**: Full RPC method selection
- **Logs**: Kaspad, Miner, Rothschild live logs

---

## Configuration

### config.env
```bash
RUSTY_KASPA_DIR=/Users/4dsto/rusty-kaspa-tn12
MINING_ADDRESS=kaspatest:...
RPC_PORT=16210
MINER_THREADS=8
```

### dashboard-tn12/config.js
```javascript
module.exports = {
    ktn12Dir: '/Users/4dsto/ktn12',
    rpcHost: '127.0.0.1',
    rpcPort: 16210,
    // ...
};
```

---

## Pre-funded Wallets

### Main Wallet
- **Private Key:** `b23f42d4a5f9c2963f4b73403f7efcb12b28983f808f0092b43da55ee53317e7`
- **Address:** `kaspatest:qqd3dnqcdcp7gst82lwlvl8k6jpkgzxsgar630uwegrcvr8f63yu7yftcxsen`

### Recipient
- **Address:** `kaspatest:qztewtux4hsrcekswxcrrfhaez692n44fegr3rd5z3rjm85d2ug8xhp0lzg33`

---

## Building from Source

### Rusty-Kaspa
```bash
git clone --branch tn12 https://github.com/kaspanet/rusty-kaspa.git rusty-kaspa-tn12
cd rusty-kaspa-tn12
cargo build --release --bin kaspad
cargo build --release --bin rothschild
```

### Miner
```bash
git clone https://github.com/kaspanet/cpuminer
cd cpuminer
cargo build --release
# Output: target/release/kaspa-miner
```

---

## Atomic Swap (Panel 13)

The dashboard includes an atomic swap panel (Panel 13) for KAS ↔ ETH swaps.

### Features
- **KAS → ETH** and **ETH → KAS** swap directions
- **HTLC-based** atomic swaps using SilverScript contracts
- **AI Agent Intent** - Type natural language like "swap 1 kas for eth"
- **TN12 Optimized** - Uses 10 BPS block time for faster settlements

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/atomic-swap/initiate` | POST | Initiate atomic swap |
| `/api/atomic-swap/accept` | POST | Accept incoming swap |
| `/api/atomic-swap/claim` | POST | Claim with preimage |
| `/api/atomic-swap/refund` | POST | Refund after timelock |
| `/api/atomic-swap/list` | GET | List active swaps |
| `/api/atomic-swap/intent` | POST | AI agent intent parser |

### Usage
1. Go to Panel 13 in the dashboard
2. Select swap direction (KAS→ETH or ETH→KAS)
3. Enter your keys and swap parameters
4. Click "Initiate Swap"
5. Share the HTLC address with counterparty
6. Once counterparty funds their HTLC, claim your funds

### Python Wallet Script
Located at `dashboard-tn12/scripts/kaspa_wallet.py`

```bash
# Install dependencies
pip install kaspa

# Check balance
python scripts/kaspa_wallet.py balance <address>

# Send KAS
python scripts/kaspa_wallet.py send <key> <to> <amount>

# Deploy HTLC
python scripts/kaspa_wallet.py deploy-htlc <key> <hashlock> <timelock> <recipient> <amount>
```

---

## Troubleshooting

### Node not syncing
- Check logs: `tail -f kaspad.log`
- Verify peers: Dashboard → Debug Console → Check Kaspad

### Miner not starting
- Ensure node is synced
- Check mining address is valid
- Try `--mine-when-not-synced` flag

### API errors
- Restart dashboard: `pkill -f "node server.js" && cd dashboard-tn12 && node server.js &`
- Check kaspad is running: `ps aux | grep kaspad`

---

## Project Structure

```
KTN12/
├── config.env              # Environment configuration
├── start_tn12.sh          # Start kaspad script
├── switch_kaspad.sh       # Switch kaspad versions
├── kaspa-miner            # CPU miner binary
├── kaspad                 # Node binary (symlink)
├── kaspad.tn12           # Backup node binary
├── dashboard-tn12/
│   ├── server.js          # Node.js API server
│   ├── index.html        # Main dashboard
│   ├── controlpanel.html # Control panel
│   ├── config.js         # Dashboard config
│   └── package.json      # Node dependencies
├── guardian/             # Guardian contract config
└── rusty-kaspa-tn12/    # Node source (external)
    └── target/release/
        ├── kaspad        # Node binary
        └── rothschild    # Tx generator
```

---

## Dependencies

- **Node.js** >= 14.x
- **Rust** (for building kaspad/rothschild)
- **kaspanet/rusty-kaspa** (tn12 branch)
- **kaspanet/cpuminer** (v0.2.6)

---

## License

MIT
