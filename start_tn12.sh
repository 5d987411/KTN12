#!/bin/bash
# Start Kaspa Testnet 12 Node

cd "$(dirname "$0")/../rusty-kaspa"

echo "Starting Kaspa Testnet 12 node..."
echo ""

mkdir -p ~/.kaspa-testnet12

nohup ./target/release/kaspad \
    --testnet \
    --netsuffix=12 \
    --utxoindex \
    --appdir ~/.kaspa-testnet12 \
    > /tmp/kaspad_tn12.log 2>&1 &

PID=$!
echo $PID > /tmp/kaspad.pid

echo "✅ Kaspad started with PID: $PID"
echo ""
echo "Log file: /tmp/kaspad_tn12.log"
echo "RPC: localhost:16210"
echo "P2P: 0.0.0.0:16311"
echo ""
echo "Monitor with: tail -f /tmp/kaspad_tn12.log"
echo "Stop with:    kill $PID"
echo ""
echo "Waiting 5 seconds for startup..."
sleep 5
tail -20 /tmp/kaspad_tn12.log
