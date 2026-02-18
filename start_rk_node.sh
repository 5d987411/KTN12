#!/bin/bash
# Start Kaspa Testnet 12 Node (OLD/existing binary)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/config.env"

KASPAD_BIN="$SCRIPT_DIR/kaspad"

echo "Starting Kaspa Testnet 12 node (existing binary)..."
echo "Binary: $KASPAD_BIN"
echo "Data Dir: $KASPAD_DATA_DIR"
echo ""

mkdir -p "$KASPAD_DATA_DIR"

nohup "$KASPAD_BIN" \
    --testnet \
    --netsuffix=12 \
    --utxoindex \
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
echo "Monitor with: tail -f $KASPAD_LOG"
echo "Stop with:    kill $PID"
echo ""
echo "Waiting 5 seconds for startup..."
sleep 5
tail -20 "$KASPAD_LOG"
