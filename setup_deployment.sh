#!/bin/bash
# Kaspa Testnet 12 Deployment Setup Script
# This script sets up the full deployment pipeline for Silverscript contracts

set -e

echo "=========================================="
echo "Kaspa Testnet 12 Deployment Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

RUSTY_KASPA_DIR="/home/cliff/rusty-kaspa"
SILVERSCRIPT_DIR="/home/cliff/silverscript"
DEPLOY_DIR="$SILVERSCRIPT_DIR/deployments"

# Create deployment directory
mkdir -p $DEPLOY_DIR

echo -e "${GREEN}Step 1: Checking Prerequisites${NC}"
echo "----------------------------------------"

# Check if kaspad exists
if [ ! -f "$RUSTY_KASPA_DIR/target/release/kaspad" ]; then
    echo -e "${YELLOW}WARNING: kaspad binary not found!${NC}"
    echo "Building kaspad... (this may take 10-20 minutes)"
    cd $RUSTY_KASPA_DIR
    cargo build --release --bin kaspad
else
    echo -e "${GREEN}✓ kaspad binary found${NC}"
fi

# Check if rothschild exists
if [ ! -f "$RUSTY_KASPA_DIR/target/release/rothschild" ]; then
    echo -e "${YELLOW}WARNING: rothschild binary not found!${NC}"
    echo "Building rothschild..."
    cd $RUSTY_KASPA_DIR
    cargo build --release --bin rothschild
else
    echo -e "${GREEN}✓ rothschild binary found${NC}"
fi

echo ""
echo -e "${GREEN}Step 2: Wallet Setup${NC}"
echo "----------------------------------------"

# Generate wallet
WALLET_FILE="$DEPLOY_DIR/wallet.txt"
if [ ! -f "$WALLET_FILE" ]; then
    echo "Generating new wallet..."
    cd $RUSTY_KASPA_DIR
    
    # Start kaspad in background for wallet generation
    echo "Starting temporary kaspad node..."
    ./target/release/kaspad --testnet --netsuffix=12 --utxoindex --ram-scale=0.5 &
    KASPAD_PID=$!
    
    # Wait for node to start
    sleep 10
    
    # Generate wallet
    ./target/release/rothschild 2>&1 | tee $WALLET_FILE
    
    # Extract private key and address
    PRIVATE_KEY=$(grep -oP 'Generated private key \K[0-9a-f]+' $WALLET_FILE)
    ADDRESS=$(grep -oP 'address \Kkaspatest:[a-z0-9]+' $WALLET_FILE)
    
    echo ""
    echo -e "${GREEN}Wallet Generated!${NC}"
    echo "Private Key: $PRIVATE_KEY"
    echo "Address: $ADDRESS"
    echo ""
    echo -e "${YELLOW}IMPORTANT: Save this information securely!${NC}"
    echo ""
    
    # Kill temporary node
    kill $KASPAD_PID 2>/dev/null || true
    sleep 2
else
    echo -e "${GREEN}✓ Wallet already exists${NC}"
    cat $WALLET_FILE
fi

echo ""
echo -e "${GREEN}Step 3: Funding Instructions${NC}"
echo "----------------------------------------"
echo "To deploy contracts, you need testnet KAS coins."
echo ""
echo "Option 1: Use the faucet"
echo "  1. Visit: https://faucet-tn12.kaspanet.io"
echo "  2. Enter your address (shown above)"
echo "  3. Request testnet coins"
echo ""
echo "Option 2: Ask in Discord"
echo "  1. Join Kaspa Discord: https://discord.gg/kaspa"
echo "  2. Go to #testnet channel"
echo "  3. Request coins from community"
echo ""
echo "Option 3: Mine coins yourself"
echo "  1. Download kaspa-miner from: https://github.com/kaspanet/cpuminer/releases"
echo "  2. Run: kaspa-miner --testnet --mining-address <your-address> -p 16210 -t 1"
echo ""

echo -e "${GREEN}Step 4: Contract Deployment${NC}"
echo "----------------------------------------"
echo "Once you have testnet coins, you can deploy contracts."
echo ""
echo "Compiled contracts available:"
ls -1 $SILVERSCRIPT_DIR/*.json 2>/dev/null | grep -v "_args" | sed 's/.*\///g' | nl
echo ""

echo -e "${GREEN}Step 5: Start Full Node${NC}"
echo "----------------------------------------"
echo "To deploy and interact with contracts, start the node:"
echo ""
echo "  cd $RUSTY_KASPA_DIR"
echo "  ./target/release/kaspad --testnet --netsuffix=12 --utxoindex --ram-scale=0.5"
echo ""
echo "Wait for the node to sync. This may take several minutes."
echo ""

echo -e "${GREEN}Step 6: Deploy Script${NC}"
echo "----------------------------------------"
echo "After the node is synced and you have coins:"
echo ""
echo "  ./deploy_contract.sh <contract-name> <private-key>"
echo ""
echo "Example:"
echo "  ./deploy_contract.sh p2pkh aa1c554386218eb28c4bsf6a02e5943799cf951dac7301324d88dec2d0119fce"
echo ""

echo "=========================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Start kaspad node (see Step 5)"
echo "  2. Get testnet coins from faucet"
echo "  3. Run deploy_contract.sh to deploy"
echo ""
