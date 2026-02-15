# Kaspa Testnet 12 Commands

## Quick Start

### Start Node
```bash
cd /Users/4dsto/kaspa-node/kaspa-testnet-12-main
./start_node.sh
```

### Stop Node
```bash
kill $(cat /tmp/kaspad.pid)
```

### Check Status
```bash
tail -f /tmp/kaspad_tn12.log
```

### Check Sync Progress
```bash
grep "IBD: Processed" /tmp/kaspad_tn12.log | tail -1
```

---

## Manual Commands

### Start kaspad directly
```bash
/Users/4dsto/kaspa-node/rusty-kaspa/target/release/kaspad \
    --testnet \
    --netsuffix=12 \
    --utxoindex \
    --appdir ~/.kaspa-testnet12
```

### Start in background (nohup)
```bash
nohup /Users/4dsto/kaspa-node/rusty-kaspa/target/release/kaspad \
    --testnet \
    --netsuffix=12 \
    --utxoindex \
    --appdir ~/.kaspa-testnet12 \
    > /tmp/kaspad_tn12.log 2>&1 &
```

### Start with custom RPC port
```bash
/Users/4dsto/kaspa-node/rusty-kaspa/target/release/kaspad \
    --testnet \
    --netsuffix=12 \
    --utxoindex \
    --rpclisten=127.0.0.1:16210 \
    --appdir ~/.kaspa-testnet12
```

---

## Dashboard

### Start Dashboard
```bash
cd /Users/4dsto/kaspa-node/dashboard
python3 server.py
```

Dashboard URL: http://localhost:8080

---

## Useful Options

| Option | Description |
|--------|-------------|
| `--testnet` | Use test network |
| `--netsuffix=12` | Testnet 12 suffix |
| `--utxoindex` | Enable UTXO index |
| `--appdir` | Data directory |
| `--reset-db` | Reset database before starting |
| `--loglevel=debug` | Set log level (off, error, warn, info, debug, trace) |
| `--addpeer=IP:PORT` | Add peer to connect |

---

## Ports

- RPC (gRPC): 16210
- RPC (wRPC Borsh): 17210
- RPC (wRPC JSON): 18210
- P2P: 16311

---

## Files

- Log: `/tmp/kaspad_tn12.log`
- PID: `/tmp/kaspad.pid`
- Data: `~/.kaspa-testnet12/`
