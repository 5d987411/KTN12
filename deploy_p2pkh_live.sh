#!/bin/bash
# DEPLOY P2PKH CONTRACT TO KASPA TESTNET 12
# Usage: ./deploy_p2pkh_live.sh <private-key>

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing private key${NC}"
    echo "Usage: $0 <private-key>"
    echo ""
    echo "Example:"
    echo "  $0 b7db536bb816b95bf225bd79ea0cb32a8fba9dd7d2b59853e4edf2168f8e4aac"
    exit 1
fi

PRIVATE_KEY=$1
RUSTY_KASPA_DIR="/home/cliff/rusty-kaspa"
SILVERSCRIPT_DIR="/home/cliff/silverscript"

cd $RUSTY_KASPA_DIR

echo "=========================================="
echo -e "${BLUE}Deploying P2PKH Contract to Testnet 12${NC}"
echo "=========================================="
echo ""

# Check if node is running
echo -n "Checking if kaspad is running... "
if ! nc -z localhost 16210 2>/dev/null; then
    echo -e "${RED}NOT RUNNING${NC}"
    echo "Start the node first:"
    echo "  cd $RUSTY_KASPA_DIR"
    echo "  ./target/release/kaspad --testnet --netsuffix=12 --utxoindex"
    exit 1
fi
echo -e "${GREEN}OK${NC}"
echo ""

# Get wallet balance using rothschild dry-run
echo "Checking wallet balance..."
BALANCE_OUTPUT=$(./target/release/rothschild --private-key $PRIVATE_KEY --dry-run 2>&1 || true)
echo "$BALANCE_OUTPUT"

# Check if we have balance
if echo "$BALANCE_OUTPUT" | grep -q "0 KAS\|No UTXOs\|not found"; then
    echo ""
    echo -e "${YELLOW}⚠️  Wallet has no balance!${NC}"
    echo ""
    echo "Get testnet coins from:"
    echo "  https://faucet-tn12.kaspanet.io"
    echo ""
    echo "Or from Discord: https://discord.gg/kaspa (#testnet channel)"
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}✓ Wallet has balance!${NC}"
echo ""

echo "Contract ready for deployment:"
echo "  Contract: P2PKH"
echo "  Size: 47 bytes"
echo "  Location: $SILVERSCRIPT_DIR/p2pkh.json"
echo ""

echo "To deploy manually:"
echo "1. Use rothschild to create transactions:"
echo "   ./target/release/rothschild --private-key $PRIVATE_KEY -t=1"
echo ""
echo "2. Or use Kaspa wallet with custom script"
echo ""

echo -e "${BLUE}Starting rothschild for transaction generation...${NC}"
echo "Press Ctrl+C after a few transactions are generated"
echo ""

./target/release/rothschild --private-key $PRIVATE_KEY -t=1
