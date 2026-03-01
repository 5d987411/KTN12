# KTN12 Session Debug - Feb 21, 2026

## Wallets

| Wallet | Address | Private Key | Balance |
|--------|---------|-------------|---------|
| A | `kaspatest:qp2ltc576eyy8hag0tckl9kqk62cvfz7p2egrlczyw9978zsh322jtnrx469r` | Unknown | - |
| B (Receiver) | `kaspatest:qpx598t8l8l6g7ntq37fd9ecq7g2s90vk376tu28u4r7cnwf4nvmcruc3nd4d` | Unknown | 1,417.99 TKAS |
| C (Sender) | `kaspatest:qpy0rcmfx7sy089a8swvxv3qqkpnahsn7ezf9730cpxq9v92f6s3s3r665xq6` | `2801d8dd39a65ab310142a1384a3f14788f89fc7766f9a72a93f22f543148897` | 0 TKAS (spent) |

## Rothschild Run Summary (Feb 20)

- **Funding**: 10,000 TKAS (original)
- **Received by B**: ~1,412 TKAS
- **"Lost"**: ~8,588 TKAS (spent on fees)
- **Transactions**: 52
- **Issue**: Without `--send-amount`, rothschild spends entire UTXO each tx

## Transactions Chain (Last)

```
Original Funding: a1588e34b0655... → 10,000 TKAS to qpy0rcmfx...
  ↓
adeabb5c75838... → Split to 2x 4,999.99993660 TKAS
  ↓
c31a8b621790... → Split to 2x 2,499.99990490 TKAS to qpx598t8l8... (receiver)
  ↓
... (52 transactions total)
  ↓
Final: qpy0rcmfx... = 0 TKAS, qpx598t8l8... = 1,411.99 TKAS
```

## Dashboard Commands

### MINING
| Command | Description |
|---------|-------------|
| `miner-status` | Get miner status |
| `miner-start` | Toggle CPU miner (with address, threads) |
| `rothschild-start` | Start TX generator |
| `rothschild-stop` | Stop TX generator |

### WALLET
| Command | Description |
|---------|-------------|
| `generate` | Generate new wallet |
| `load` | Load from private key |
| `send` | Send KAS |

### SILVERSCRIPT
| Command | Description |
|---------|-------------|
| `silver-compile` | Compile .sil file |
| `silver-list` | List examples |

### CONTRACTS
| Command | Description |
|---------|-------------|
| `p2pkh` | P2PKH Contract |
| `multisig` | Multisig Contract |
| `escrow` | Escrow Contract |
| `hodl` | HODL Vault |
| `mecenas` | Mecenas Contract |

### COMPILER
| Command | Description |
|---------|-------------|
| `compile` | Compile SilverScript |
| `deploy` | Deploy Contract |

## Rothschild Versions

| Version | Binary | Supports --send-amount |
|---------|--------|----------------------|
| rusty-kaspa | `/Users/4dsto/rusty-kaspa-tn12/target/release/rothschild` | ✅ Yes |
| smartgoo | `/Users/4dsto/smartgoo-rusty-kaspa/target/release/rothschild` | ❌ No |

## Rothschild Parameters

| Parameter | Description |
|-----------|-------------|
| version | rusty-kaspa or smartgoo |
| private_key | Sender's private key hex |
| recipient | Recipient address |
| tps | Transactions per second |
| threads | Worker threads (0=auto) |
| priority_fee | Priority fee in sompi |
| send_amount | Amount per tx in KAS (rusty-kaspa only) |
| randomize_fee | yes/no |
| randomize_tx_version | yes/no (rusty-kaspa only) |

## Example Working Command

```bash
# With --send-amount to preserve balance
rothschild \
  -k <PRIVATE_KEY> \
  -a <RECIPIENT> \
  -t 1 \
  -m 1 \
  -s localhost:16210
```

## Known Issues

1. **Rothschild "not enough funds"**: Local UTXO not synced with public API
2. **Balance "lost"**: Without `--send-amount`, fees consume most of the value
3. **Wallet B private key unknown**: Cannot flip sender/receiver

## Files Modified

- `dashboard-tn12/index.html`
- `dashboard-tn12/server.js`
- `dashboard-tn12/config.js`

## Git Commit

```
Commit: 092702b
Message: Add rothschild version selector and parameters
```
