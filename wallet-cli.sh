#!/bin/bash
#
# Wallet CLI for Kaspa TN12
# Wrapper around kgraf3 CLI with TN12 defaults
#

set -e

# Configuration
CLI_NAME="kaspa-graffiti-cli"
DEFAULT_RPC="https://api-tn12.kaspa.org"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_PATH="${SCRIPT_DIR}/target/release/${CLI_NAME}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_usage() {
    echo -e "${CYAN}Kaspa TN12 Wallet CLI${NC}"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  generate                      Generate a new wallet"
    echo "  load <private_key>            Load wallet from private key"
    echo "  balance <address>             Check balance (TN12)"
    echo "  balance-tn10 <address>        Check balance (TN10)"
    echo "  utxos <address>              Get UTXOs for address"
    echo "  transfer <key> <addr> <amt>  Transfer KAS (amt in KAS)"
    echo "  hd-generate                  Generate HD wallet"
    echo "  hd-load <seed>               Load HD wallet"
    echo "  derive-address <seed> <idx>  Derive address from seed"
    echo ""
    echo "  Deadman Switch Commands:"
    echo "  deadman-deploy <owner_key> <beneficiary_pubkey> <timeout_sec> <amount>"
    echo "  deadman-heartbeat <contract_addr> <owner_key>"
    echo "  deadman-cancel <contract_addr> <owner_key>"
    echo "  deadman-claim <contract_addr> <beneficiary_key>"
    echo "  deadman-state <contract_addr>"
    echo ""
    echo "  Contract Compilation:"
    echo "  silverc <file.sil>           Compile Silverscript contract"
    echo "  help                          Show this help"
    echo ""
    echo "Options:"
    echo "  --rpc <url>    Override RPC endpoint"
    echo "  -h, --help     Show help"
    echo ""
    echo "Default RPC: ${DEFAULT_RPC}"
    echo ""
    echo "Examples:"
    echo "  $0 generate"
    echo "  $0 balance kaspatest:..."
    echo "  $0 transfer <key> <addr> 1.0"
    echo "  $0 balance kaspatest:... --rpc https://api-tn10.kaspa.org"
}

# Check if CLI exists
check_cli() {
    if [[ ! -f "$CLI_PATH" ]]; then
        echo -e "${YELLOW}CLI not found at: ${CLI_PATH}${NC}"
        echo -e "${YELLOW}Attempting to find in common locations...${NC}"
        
        # Try alternative locations
        if [[ -f "${SCRIPT_DIR}/${CLI_NAME}" ]]; then
            CLI_PATH="${SCRIPT_DIR}/${CLI_NAME}"
        elif [[ -f "${SCRIPT_DIR}/bin/${CLI_NAME}" ]]; then
            CLI_PATH="${SCRIPT_DIR}/bin/${CLI_NAME}"
        elif command -v "$CLI_NAME" &> /dev/null; then
            CLI_PATH=$(command -v "$CLI_NAME")
        else
            echo -e "${RED}Error: ${CLI_NAME} not found${NC}"
            echo ""
            echo "To build:"
            echo "  cd ../kgraf3 && cargo build --release"
            echo "  cp ../kgraf3/target/release/${CLI_NAME} ${SCRIPT_DIR}/"
            exit 1
        fi
    fi
    echo -e "${GREEN}Using CLI: ${CLI_PATH}${NC}"
}

# Main command dispatcher
case "${1:-help}" in
    generate)
        check_cli
        shift
        "$CLI_PATH" generate "$@"
        ;;
    load)
        check_cli
        if [[ -z "${2:-}" ]]; then
            echo -e "${RED}Error: Private key required${NC}"
            echo "Usage: $0 load <private_key>"
            exit 1
        fi
        shift
        "$CLI_PATH" load "$@"
        ;;
    balance)
        check_cli
        if [[ -z "${2:-}" ]]; then
            echo -e "${RED}Error: Address required${NC}"
            echo "Usage: $0 balance <address>"
            exit 1
        fi
        shift
        "$CLI_PATH" balance "$@" --rpc "$DEFAULT_RPC"
        ;;
    balance-tn10)
        check_cli
        if [[ -z "${2:-}" ]]; then
            echo -e "${RED}Error: Address required${NC}"
            echo "Usage: $0 balance-tn10 <address>"
            exit 1
        fi
        shift
        "$CLI_PATH" balance "$@" --rpc "https://api-tn10.kaspa.org"
        ;;
    utxos)
        check_cli
        if [[ -z "${2:-}" ]]; then
            echo -e "${RED}Error: Address required${NC}"
            echo "Usage: $0 utxos <address>"
            exit 1
        fi
        shift
        "$CLI_PATH" utxos "$@" --rpc "$DEFAULT_RPC"
        ;;
    transfer)
        check_cli
        if [[ -z "${2:-}" ]] || [[ -z "${3:-}" ]] || [[ -z "${4:-}" ]]; then
            echo -e "${RED}Error: Missing arguments${NC}"
            echo "Usage: $0 transfer <private_key> <recipient> <amount>"
            echo "Example: $0 transfer <key> kaspatest:... 1.0"
            exit 1
        fi
        shift
        "$CLI_PATH" transfer "$@" --rpc "$DEFAULT_RPC"
        ;;
    hd-generate)
        check_cli
        shift
        "$CLI_PATH" hd-generate "$@"
        ;;
    hd-load)
        check_cli
        if [[ -z "${2:-}" ]]; then
            echo -e "${RED}Error: Seed required${NC}"
            echo "Usage: $0 hd-load <seed>"
            exit 1
        fi
        shift
        "$CLI_PATH" hd-load "$@"
        ;;
    derive-address)
        check_cli
        if [[ -z "${2:-}" ]] || [[ -z "${3:-}" ]]; then
            echo -e "${RED}Error: Missing arguments${NC}"
            echo "Usage: $0 derive-address <seed> <index>"
            exit 1
        fi
        shift
        "$CLI_PATH" derive-address "$@"
        ;;
    derive-many)
        check_cli
        if [[ -z "${2:-}" ]] || [[ -z "${3:-}" ]]; then
            echo -e "${RED}Error: Missing arguments${NC}"
            echo "Usage: $0 derive-many <seed> <count>"
            exit 1
        fi
        shift
        "$CLI_PATH" derive-many "$@"
        ;;
    deadman-deploy)
        if [[ -z "${2:-}" ]] || [[ -z "${3:-}" ]] || [[ -z "${4:-}" ]] || [[ -z "${5:-}" ]]; then
            echo -e "${RED}Error: Missing arguments${NC}"
            echo "Usage: $0 deadman-deploy <owner_key> <beneficiary_pubkey> <timeout_sec> <amount>"
            echo ""
            echo "Example:"
            echo "  $0 deadman-deploy <key> 02... 300 100"
            echo "  # Deploys deadman switch with:"
            echo "  # - Owner private key"
            echo "  # - Beneficiary public key (hex)"
            echo "  # - Timeout in seconds (300 = 5 min)"
            echo "  # - Amount in KAS"
            exit 1
        fi
        echo -e "${CYAN}Deadman Switch Deployment${NC}"
        echo -e "${YELLOW}Note: Use deploy_contract.sh for full deployment${NC}"
        echo ""
        echo "Owner: (from key)"
        echo "Beneficiary pubkey: ${3}"
        echo "Timeout: ${4} seconds"
        echo "Amount: ${5} KAS"
        echo ""
        echo "This requires:"
        echo "1. Compile deadman_simple.sil with constructor args"
        echo "2. Send funds to contract address"
        echo "3. Use deploy_contract.sh in ktn12"
        ;;
    deadman-heartbeat)
        if [[ -z "${2:-}" ]] || [[ -z "${3:-}" ]]; then
            echo -e "${RED}Error: Missing arguments${NC}"
            echo "Usage: $0 deadman-heartbeat <contract_addr> <owner_key>"
            exit 1
        fi
        echo -e "${CYAN}Deadman Heartbeat${NC}"
        echo "Contract: ${2}"
        echo "Owner: (from key)"
        echo ""
        echo -e "${YELLOW}This sends a heartbeat transaction to reset the timeout.${NC}"
        ;;
    deadman-cancel)
        if [[ -z "${2:-}" ]] || [[ -z "${3:-}" ]]; then
            echo -e "${RED}Error: Missing arguments${NC}"
            echo "Usage: $0 deadman-cancel <contract_addr> <owner_key>"
            exit 1
        fi
        echo -e "${CYAN}Deadman Cancel${NC}"
        echo "Contract: ${2}"
        echo "Owner: (from key)"
        echo ""
        echo -e "${YELLOW}This cancels the contract and returns funds to owner.${NC}"
        ;;
    deadman-claim)
        if [[ -z "${2:-}" ]] || [[ -z "${3:-}" ]]; then
            echo -e "${RED}Error: Missing arguments${NC}"
            echo "Usage: $0 deadman-claim <contract_addr> <beneficiary_key>"
            exit 1
        fi
        echo -e "${CYAN}Deadman Claim${NC}"
        echo "Contract: ${2}"
        echo "Beneficiary: (from key)"
        echo ""
        echo -e "${YELLOW}This claims funds after timeout has elapsed.${NC}"
        ;;
    deadman-state)
        if [[ -z "${2:-}" ]]; then
            echo -e "${RED}Error: Missing arguments${NC}"
            echo "Usage: $0 deadman-state <contract_addr>"
            exit 1
        fi
        echo -e "${CYAN}Deadman Contract State${NC}"
        echo "Contract: ${2}"
        echo ""
        # Try to get contract info from API
        echo -e "${GREEN}Querying contract...${NC}"
        curl -s "${DEFAULT_RPC}/addresses/${2}/utxos" | head -50 || echo "No UTXOs found"
        ;;
    silverc)
        # Compile silverscript - check for silverc binary
        SILVERC="${SCRIPT_DIR}/../kgraf3/target/release/silverc"
        if [[ ! -f "$SILVERC" ]]; then
            SILVERC="${SCRIPT_DIR}/silverc"
        fi
        if [[ ! -f "$SILVERC" ]]; then
            echo -e "${RED}Error: silverc not found${NC}"
            echo "Compile from: cd ../ktn12 && cargo build --release -p silverc"
            exit 1
        fi
        shift
        "$SILVERC" "$@"
        ;;
    help|--help|-h)
        print_usage
        ;;
    *)
        # Pass through to CLI directly (allows custom commands)
        check_cli
        "$CLI_PATH" "$@"
        ;;
esac
