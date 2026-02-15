#!/bin/bash
# Quick status check for Kaspa Testnet 12 deployment setup

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

RUSTY_KASPA_DIR="/home/cliff/rusty-kaspa"
SILVERSCRIPT_DIR="/home/cliff/silverscript"

echo "=========================================="
echo -e "${BLUE}Kaspa Testnet 12 Setup Status${NC}"
echo "=========================================="
echo ""

# Check binaries
echo -e "${BLUE}1. Binaries${NC}"
echo "----------------------------------------"

KASPAD_EXISTS="no"
ROTHSCHILD_EXISTS="no"
SILVERC_EXISTS="no"

if [ -f "$RUSTY_KASPA_DIR/target/release/kaspad" ] || [ -f "$RUSTY_KASPA_DIR/target/debug/kaspad" ]; then
    echo -e "${GREEN}✓${NC} kaspad"
    KASPAD_EXISTS="yes"
else
    echo -e "${RED}✗${NC} kaspad (needs build)"
fi

if [ -f "$RUSTY_KASPA_DIR/target/release/rothschild" ] || [ -f "$RUSTY_KASPA_DIR/target/debug/rothschild" ]; then
    echo -e "${GREEN}✓${NC} rothschild"
    ROTHSCHILD_EXISTS="yes"
else
    echo -e "${RED}✗${NC} rothschild (needs build)"
fi

if [ -f "$SILVERSCRIPT_DIR/target/release/silverc" ]; then
    echo -e "${GREEN}✓${NC} silverc"
    SILVERC_EXISTS="yes"
else
    echo -e "${RED}✗${NC} silverc (needs build)"
fi

echo ""

# Check compiled contracts
echo -e "${BLUE}2. Compiled Contracts${NC}"
echo "----------------------------------------"

CONTRACT_COUNT=$(ls -1 $SILVERSCRIPT_DIR/*.json 2>/dev/null | grep -v "_args\|_deploy" | wc -l)
if [ $CONTRACT_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓${NC} $CONTRACT_COUNT contracts compiled"
    ls -1 $SILVERSCRIPT_DIR/*.json 2>/dev/null | grep -v "_args\|_deploy" | xargs -I {} basename {} | sed 's/^/   - /'
else
    echo -e "${YELLOW}!${NC} No contracts compiled yet"
fi

echo ""

# Check node status
echo -e "${BLUE}3. Node Status${NC}"
echo "----------------------------------------"

if nc -z localhost 16210 2>/dev/null; then
    echo -e "${GREEN}✓${NC} kaspad is running (RPC port 16210)"
    
    # Try to get sync status
    if command -v curl &> /dev/null; then
        SYNC_STATUS=$(curl -s -X POST http://localhost:16210 \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"getBlockCount","params":[],"id":1}' 2>/dev/null | grep -o '"blockCount":[0-9]*' | cut -d: -f2)
        if [ ! -z "$SYNC_STATUS" ]; then
            echo "   Block count: $SYNC_STATUS"
        fi
    fi
else
    echo -e "${RED}✗${NC} kaspad is not running"
    echo "   Start with: cd $RUSTY_KASPA_DIR && ./target/release/kaspad --testnet --netsuffix=12 --utxoindex"
fi

echo ""

# Check wallet
echo -e "${BLUE}4. Wallet${NC}"
echo "----------------------------------------"

if [ -f "$SILVERSCRIPT_DIR/deployments/wallet.txt" ]; then
    echo -e "${GREEN}✓${NC} Wallet generated"
    ADDRESS=$(grep -oP 'address \Kkaspatest:[a-z0-9]+' $SILVERSCRIPT_DIR/deployments/wallet.txt 2>/dev/null || echo "not found")
    if [ "$ADDRESS" != "not found" ]; then
        echo "   Address: $ADDRESS"
    fi
else
    echo -e "${YELLOW}!${NC} No wallet generated"
    echo "   Run: ./setup_deployment.sh"
fi

echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}Next Steps${NC}"
echo "=========================================="
echo ""

if [ "$KASPAD_EXISTS" = "no" ]; then
    echo -e "${YELLOW}1. Build kaspad:${NC}"
    echo "   cd $RUSTY_KASPA_DIR"
    echo "   cargo build --release --bin kaspad"
    echo ""
fi

if [ "$ROTHSCHILD_EXISTS" = "no" ]; then
    echo -e "${YELLOW}1. Build rothschild:${NC}"
    echo "   cd $RUSTY_KASPA_DIR"
    echo "   cargo build --release --bin rothschild"
    echo ""
fi

if [ $CONTRACT_COUNT -eq 0 ]; then
    echo -e "${YELLOW}2. Compile contracts:${NC}"
    echo "   cd $SILVERSCRIPT_DIR"
    echo "   ./target/release/silverc contract.sil --constructor-args args.json -o output.json"
    echo ""
fi

echo -e "${GREEN}Quick Commands:${NC}"
echo "----------------------------------------"
echo "Start node:     cd $RUSTY_KASPA_DIR && ./target/release/kaspad --testnet --netsuffix=12 --utxoindex"
echo "Check status:   ./check_status.sh"
echo "Deploy:         ./deploy_contract.sh <contract> <private-key>"
echo "Read guide:     cat DEPLOYMENT_GUIDE.md"
echo ""
