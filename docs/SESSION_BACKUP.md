# TN12 Dashboard - Backup Documentation

## Session Date: 2026-02-18

## Current Status

### Running Services
- **Node (kaspad):** Running on localhost:18210 (TN12)
- **Dashboard:** Running on http://localhost:3001
- **Miner:** Running (check with `ps aux | grep kaspa-miner`)

### Wallet Addresses

| Name | Private Key | Address | Notes |
|------|-------------|---------|-------|
| Wallet A (Main/Miner) | `2d4e8a0a47218b076b4ce72b6df900dba0cfd774240bf1942e3830578615ac09` | `kaspatest:qp2ltc576eyy8hag0tckl9kqk62cvfz7p2egrlczyw9978zsh322jtnrx469r` | Mining rewards - ~1.8M KAS |
| Wallet B (Recipient) | - | `kaspatest:qztewtux4hsrcekswxcrrfhaez692n44fegr3rd5z3rjm85d2ug8xhp0lzg33` | Test recipient |
| Wallet C (Test) | Loaded via console | Loaded via `load <private_key>` | For sending |

### Test Wallets (Pre-funded)
```
Wallet 1 (~310 KAS):
Private Key: 190dafc03c70b13cfab2c9d7760936e5f2b359f3efcbfc2a21edb14419d8ebdc
Address: kaspatest:qpgwz2khk48z6037tecfmm96maykaqrsqtf5efej99tfk6c2phvkjl0vzzkjd

Wallet 2:
Private Key: b7a5eb2f55703b5ed11a69d83e52819427f8ff572604678f93454363e6582aa5
Address: kaspatest:qqyjznylj2sy6kvp4cxjhw2qdqqsnzn2l362j7apttq6au7zregg7pxfvlqp7
```

## Binary Locations

| Binary | Path |
|--------|------|
| Node | `/Users/4dsto/ktn12/kaspad` |
| Wallet CLI (broken send) | `/Users/4dsto/ktn12/target/release/kaspa-wallet-cli` |
| Full Wallet | `/Users/4dsto/ktn12/target/release/kaspa-wallet` |
| Miner | `/Users/4dsto/ktn12/kaspa-miner` |
| **Rothschild (NEW with --send-amount)** | `/Users/4dsto/ktn12/rothschild` |
| Dashboard | `/Users/4dsto/ktn12/dashboard-tn12/server.js` |
| rusty-kaspa-tn12 CLI | `/Users/4dsto/rusty-kaspa-tn12/target/release/kaspa-cli` |

## NEW: --send-amount Feature

### How It Works
The rothschild binary now accepts a `--send-amount` (or `-m`) parameter that specifies exactly how much KAS to send per transaction.

### Usage
```bash
# Send exactly 10 KAS
./rothschild -k <PRIVATE_KEY> -a <RECIPIENT> -t 1 --send-amount 10

# Without --send-amount, it sends ALL funds (original behavior)
./rothschild -k <PRIVATE_KEY> -a <RECIPIENT> -t 1
```

### Dashboard Integration
The dashboard Send button now:
1. Accepts amount from user
2. Passes it to rothschild via `--send-amount`
3. Runs for 3 seconds then stops (sending 1 transaction with exact amount)

## Commands to Restart Services

```bash
# Start Node
cd /Users/4dsto/ktn12 && ./kaspad --testnet --netsuffix=12 --utxoindex --rpclisten-json=127.0.0.1:18210

# Start Miner
./kaspa-miner --testnet --mining-address kaspatest:qp2ltc576eyy8hag0tckl9kqk62cvfz7p2egrlczyw9978zsh322jtnrx469r -p 16210 -t 2

# Start Rothschild (with amount support)
./rothschild -k <private_key> -a <recipient> -t 1 --send-amount <amount> -s localhost:16210

# Start Dashboard
cd /Users/4dsto/ktn12/dashboard-tn12 && node server.js
```

## Dashboard Usage

### Load Wallet to Wallet C (for sending)
```bash
# In console, type:
load <private_key>
# Example:
load 190dafc03c70b13cfab2c9d7760936e5f2b359f3efcbfc2a21edb14419d8ebdc
```

### Send KAS (NEW with amount!)
1. Click "Send" button
2. Private key is pre-filled from Wallet C
3. Enter recipient address (from Wallet B or any address)
4. Enter amount (e.g., 10, 100, 1000)
5. Click RUN
6. Dashboard will auto-stop after 3 seconds (sends 1 transaction)

### Console Commands
- **generate** - Generate new wallet (goes to Wallet A)
- **load** - Load wallet from private key (goes to Wallet C)
- **balance** - Check balance of an address
- **utxos** - List UTXOs for an address

## Known Issues

1. **wallet-cli send broken**: `kaspa-wallet-cli send` accepts amount but doesn't actually send - it just lists UTXOs and suggests using rothschild.

2. **FIXED: rothschild now supports --send-amount**: The new rothschild binary accepts `-m <amount>` or `--send-amount <amount>` to send a specific KAS amount per transaction.

## Files Modified

- `dashboard-tn12/index.html` - Updated sendKAS to use rothschild with --send-amount
- `dashboard-tn12/server.js` - Added amount parameter to rothschild API
- `rusty-kaspa-tn12/rothschild/src/main.rs` - Added --send-amount CLI argument

## Git Repositories Used

- **rusty-kaspa**: https://github.com/kaspanet/rusty-kaspa (tn12 branch)
- **cpuminer**: https://github.com/kaspanet/cpuminer (v0.2.6)
- **rothschild**: https://github.com/someone235/rothschild

## Chain Data

- Location: `/Users/4dsto/.rusty-kaspa/kaspa-testnet-12`
- Size: ~45GB
