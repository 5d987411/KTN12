#!/bin/bash
# Deploy Silverscript Contract to Kaspa Testnet 12
# Usage: ./deploy_contract.sh <contract-name> <private-key> [constructor-args-file]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo "Usage: $0 <contract-name> <private-key> [constructor-args-file]"
    echo ""
    echo "Example:"
    echo "  $0 p2pkh aa1c554386218eb28c4bsf6a02e5943799cf951dac7301324d88dec2d0119fce"
    echo "  $0 transfer_with_timeout aa1c5543... timeout_args.json"
    exit 1
fi

CONTRACT_NAME=$1
PRIVATE_KEY=$2
ARGS_FILE=${3:-"${CONTRACT_NAME}_args.json"}

SILVERSCRIPT_DIR="/home/cliff/silverscript"
RUSTY_KASPA_DIR="/home/cliff/rusty-kaspa"
CONTRACT_FILE="$SILVERSCRIPT_DIR/${CONTRACT_NAME}.json"

echo "=========================================="
echo -e "${BLUE}Silverscript Contract Deployment${NC}"
echo "=========================================="
echo ""

# Check if contract file exists
if [ ! -f "$CONTRACT_FILE" ]; then
    echo -e "${RED}Error: Contract file not found: $CONTRACT_FILE${NC}"
    echo ""
    echo "Available contracts:"
    ls -1 $SILVERSCRIPT_DIR/*.json 2>/dev/null | grep -v "_args" | xargs -I {} basename {} .json | sed 's/^/  - /'
    exit 1
fi

echo -e "${GREEN}Contract:${NC} $CONTRACT_NAME"
echo -e "${GREEN}File:${NC} $CONTRACT_FILE"
echo ""

# Check if node is running
echo -n "Checking if kaspad is running... "
if ! nc -z localhost 16210 2>/dev/null; then
    echo -e "${RED}NOT RUNNING${NC}"
    echo ""
    echo -e "${YELLOW}Please start kaspad first:${NC}"
    echo "  cd $RUSTY_KASPA_DIR"
    echo "  ./target/release/kaspad --testnet --netsuffix=12 --utxoindex"
    exit 1
fi
echo -e "${GREEN}OK${NC}"
echo ""

# Get contract details
echo -e "${BLUE}Contract Details:${NC}"
echo "----------------------------------------"
CONTRACT_NAME_FROM_FILE=$(cat $CONTRACT_FILE | grep '"contract_name"' | cut -d'"' -f4)
SCRIPT_LENGTH=$(cat $CONTRACT_FILE | grep '"script"' -A 1 | grep -o '[0-9]\+' | wc -l)
ABI_ENTRIES=$(cat $CONTRACT_FILE | grep '"abi"' -A 100 | grep '"name"' | wc -l)

echo "  Name: $CONTRACT_NAME_FROM_FILE"
echo "  Script Size: $SCRIPT_LENGTH bytes"
echo "  Entrypoints: $ABI_ENTRIES"
echo ""

# Display the bytecode (first 20 bytes)
echo -e "${BLUE}Bytecode (first 20 bytes):${NC}"
python3 -c "
import json
with open('$CONTRACT_FILE') as f:
    data = json.load(f)
    script = data['script']
    print('  ' + ' '.join([str(b) for b in script[:20]]) + '...')
"
echo ""

# Check if rothschild has funds
echo -n "Checking wallet balance... "
cd $RUSTY_KASPA_DIR
BALANCE=$(./target/release/rothschild --private-key $PRIVATE_KEY --dry-run 2>&1 | grep -i "balance\|funds" | head -1 || echo "unknown")
echo -e "${YELLOW}$BALANCE${NC}"
echo ""

echo -e "${YELLOW}NOTE: This deployment script is a template.${NC}"
echo "Full deployment requires:"
echo "  1. UTXO selection and transaction building"
echo "  2. Proper fee calculation"
echo "  3. Transaction signing and broadcasting"
echo ""
echo -e "${BLUE}To complete deployment manually:${NC}"
echo "----------------------------------------"
echo "1. Use rothschild to generate transactions:"
echo "   ./target/release/rothschild --private-key $PRIVATE_KEY -t=1"
echo ""
echo "2. Or use the Kaspa RPC directly to build and submit transactions"
echo "   with the compiled script as the locking script."
echo ""
echo -e "${GREEN}Contract bytecode is ready for deployment!${NC}"
echo ""
echo "Script location: $CONTRACT_FILE"
echo ""

# Create deployment info file
DEPLOY_INFO="$SILVERSCRIPT_DIR/${CONTRACT_NAME}_deploy_info.txt"
cat > $DEPLOY_INFO << EOF
Silverscript Contract Deployment Info
=====================================
Contract: $CONTRACT_NAME
Date: $(date)

Contract File: $CONTRACT_FILE

Instructions:
1. Ensure kaspad is running on Testnet 12
2. Ensure you have testnet KAS coins
3. Use rothschild or RPC to deploy:
   - Locking Script: Use bytecode from $CONTRACT_FILE
   - Entrypoint: See ABI in contract JSON

Manual Deployment Steps:
------------------------
1. Create transaction with P2SH output
2. Use compiled script as redeem script
3. Set appropriate value (minimum dust limit)
4. Sign and broadcast transaction

Example RPC call structure:
{
  "version": 0,
  "inputs": [...],
  "outputs": [
    {
      "amount": 100000,  // minimum amount
      "scriptPublicKey": {
        "version": 0,
        "script": <P2SH script with hash of compiled bytecode>
      }
    }
  ]
}

Contract ABI:
$(cat $CONTRACT_FILE | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d.get('abi', []), indent=2))")
EOF

echo -e "${GREEN}Deployment info saved to:${NC} $DEPLOY_INFO"
