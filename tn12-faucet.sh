#!/bin/bash
#
# TN12 Faucet/Miner Helper
# Get testnet coins for TN12
#

set -e

# Configuration
MINER_REPO="https://github.com/elichai/kaspa-miner"
MINER_BIN=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

print_usage() {
    echo -e "${CYAN}TN12 Faucet/Miner Helper${NC}"
    echo ""
    echo "TN12 does not have a web faucet. Options to get testnet coins:"
    echo ""
    echo "1. ${GREEN}Mine using kaspa-miner${NC}"
    echo "   - Download miner from: ${MINER_REPO}"
    echo "   - Run: kaspa-miner --testnet --mining-address <your-address> -p 16210 -t 1"
    echo ""
    echo "2. ${GREEN}Ask on Discord${NC}"
    echo "   - Join Kaspa Discord: https://discord.gg/kaspa"
    echo "   - Go to #testnet channel"
    echo "   - Ask for testnet coins"
    echo ""
    echo "3. ${GREEN}Use Rothschild${NC}"
    echo "   - Once you have funds, run rothschild to generate transactions"
    echo "   - ./kaspa-graffiti-cli transfer <key> <addr> <amount>"
    echo ""
}

# Check if miner exists
check_miner() {
    if command -v kaspa-miner &> /dev/null; then
        MINER_BIN=$(command -v kaspa-miner)
        return 0
    fi
    
    # Check common locations
    local locations=(
        "$HOME/kaspa-miner"
        "$HOME/go/bin/kaspa-miner"
        "/usr/local/bin/kaspa-miner"
    )
    
    for loc in "${locations[@]}"; do
        if [[ -x "$loc" ]]; then
            MINER_BIN="$loc"
            return 0
        fi
    done
    
    return 1
}

# Mine for address
mine() {
    local address="${1:-}"
    
    if [[ -z "$address" ]]; then
        echo -e "${RED}Error: Address required${NC}"
        echo "Usage: $0 mine <address> [threads]"
        echo ""
        echo "Example:"
        echo "  $0 mine kaspatest:qp0gz6pz0640shjmazxgvx94v5kn6as9rtdh5tdwkzyxs2yxc257wanzr230e 4"
        exit 1
    fi
    
    local threads="${2:-1}"
    
    if ! check_miner; then
        echo -e "${YELLOW}Miner not found. Installing...${NC}"
        echo ""
        echo "To install kaspa-miner:"
        echo "  git clone ${MINER_REPO}"
        echo "  cd kaspa-miner && cargo build --release"
        echo "  cp target/release/kaspa-miner ~/bin/"
        echo ""
        echo "Or download pre-built from: ${MINER_REPO}/releases"
        exit 1
    fi
    
    echo -e "${GREEN}Starting miner...${NC}"
    echo "Address: $address"
    echo "Threads: $threads"
    echo ""
    echo "Press Ctrl+C to stop"
    echo "---"
    
    $MINER_BIN --testnet --mining-address "$address" -p 16210 -t "$threads"
}

# Show faucet info
faucet_info() {
    print_usage
}

# Main
case "${1:-info}" in
    mine)
        shift
        mine "$@"
        ;;
    info|--info|faucet|--faucet)
        faucet_info
        ;;
    help|--help|-h)
        print_usage
        ;;
    *)
        print_usage
        ;;
esac
