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
| Node | 1.1.0-rc.3 | `/Users/4dsto/rusty-kaspa-tn12/target/release/kaspad` |
| Miner | 0.2.6 | `/Users/4dsto/ktn12/kaspa-miner` |
| Tx Generator | - | rusty-kaspa rothschild |
| Dashboard | Node.js | `dashboard-tn12/server.js` |

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
nano config.env
# Set RUSTY_KASPA_DIR to your path
# Set MINING_ADDRESS (required for mining)
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
