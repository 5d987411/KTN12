#!/bin/bash
# Start Kaspa Testnet 12 Node (v1.1.0 / TN12)
# =============================================
# New in v1.1.0:
# - VSPC API v2 (get_virtual_chain_from_block_v2)
# - KIP-16 ZK Proofs (merging)
# - KIP-17 Native Assets (TN12)
# - 10 BPS (Crescendo)
# - Retention period config

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/config.env"

# Fix for fd_budget issue on macOS - set file descriptor limit
ulimit -n 10240

echo "Starting Kaspa Testnet 12 node..."
echo "Version: v1.1.0 (Crescendo + Covenants)"
echo ""

mkdir -p "$KASPAD_DATA_DIR"

# v1.1.0 recommended flags
# --retention-period-days: Control data retention (default ~30h at 10 BPS)
# --perf-metrics: Enable performance metrics (optional)
nohup "$RUSTY_KASPA_DIR/target/release/kaspad" \
    --testnet \
    --netsuffix=12 \
    --utxoindex \
    --retention-period-days=1.5 \
    --rpclisten=127.0.0.1:16210 \
    --rpclisten-json=127.0.0.1:18210 \
    --rpclisten-borsh=127.0.0.1:17210 \
    --unsaferpc \
    --enable-unsynced-mining \
    --listen=0.0.0.0:16311 \
    --addpeer=23.118.8.168 \
    --async-threads=12 \
    --ram-scale=2 \
    --appdir "$KASPAD_DATA_DIR" \
    > "$KASPAD_LOG" 2>&1 &

PID=$!
echo $PID > "$SCRIPT_DIR/kaspad.pid"

echo "✅ Kaspad started with PID: $PID"
echo ""
echo "Log file: $KASPAD_LOG"
echo "RPC: localhost:$RPC_PORT"
echo "P2P: 0.0.0.0:$P2P_PORT"
echo ""
echo "Features enabled:"
echo "  ✨ Covenants (TN12)"
echo "  ✨ 10 BPS (Crescendo)"
echo "  ✨ VSPC API v2"
echo "  ✨ KIP-17 Native Assets"
echo ""
echo "Monitor with: tail -f $KASPAD_LOG"
echo "Stop with:    kill $PID"
echo ""
echo "Waiting 5 seconds for startup..."
sleep 5
tail -20 "$KASPAD_LOG"
