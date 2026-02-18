# KTN12 Startup Instructions

## Quick Start

```bash
cd /Users/4dsto/ktn12

# Stop any running node
./stop_node.sh

# Start with NEW tn12-built binary (recommended)
./start_tn12_kaspad.sh

# OR start with OLD/existing binary
./start_rk_node.sh
```

## Scripts Overview

| Script | Binary | Path |
|--------|--------|------|
| `start_tn12_kaspad.sh` | NEW | `/Users/4dsto/rusty-kaspa-tn12/target/release/kaspad` |
| `start_rk_node.sh` | OLD | `/Users/4dsto/ktn12/kaspad` |
| `stop_node.sh` | - | Stops any running kaspad |

## Default Ports

- **RPC:** localhost:16210
- **P2P:** 0.0.0.0:16311
- **Log:** `/tmp/kaspad_tn12.log`
- **PID:** `/tmp/kaspad.pid`

## Monitoring

```bash
# View logs
tail -f /tmp/kaspad_tn12.log

# Check if running
cat /tmp/kaspad.pid
ps -p $(cat /tmp/kaspad.pid)

# Check process
ps aux | grep kaspad
```

## Switching Between Versions

1. Stop current node:
   ```bash
   ./stop_node.sh
   ```

2. Start desired version:
   ```bash
   ./start_tn12_kaspad.sh   # NEW tn12 build
   # OR
   ./start_rk_node.sh       # OLD existing binary
   ```

## Binaries

- **NEW (tn12):** `/Users/4dsto/rusty-kaspa-tn12/target/release/kaspad`
- **OLD:** `/Users/4dsto/ktn12/kaspad`

Built from: https://github.com/kaspanet/rusty-kaspa/tree/tn12
