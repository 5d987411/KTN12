#!/bin/bash
# First-time setup check
# Run this to verify your configuration before starting

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if config.env exists, if not copy from example
if [ ! -f "$SCRIPT_DIR/config.env" ]; then
    if [ -f "$SCRIPT_DIR/config.env.example" ]; then
        echo "Creating config.env from template..."
        cp "$SCRIPT_DIR/config.env.example" "$SCRIPT_DIR/config.env"
        echo "✅ Created config.env from template"
        echo "   Please edit config.env and set your MINING_ADDRESS"
        exit 1
    else
        echo "❌ config.env not found"
        exit 1
    fi
fi

source "$SCRIPT_DIR/config.env"

echo "========================================"
echo "KTN12 Configuration Check"
echo "========================================"
echo ""

ERRORS=0

# Check config.env exists
if [ ! -f "$SCRIPT_DIR/config.env" ]; then
    echo "❌ config.env not found"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ config.env found"
fi

# Check RUSTY_KASPA_DIR
if [ -d "$RUSTY_KASPA_DIR" ]; then
    echo "✅ Rusty-Kaspa directory: $RUSTY_KASPA_DIR"
    if [ -f "$RUSTY_KASPA_DIR/target/release/kaspad" ]; then
        echo "✅ kaspad binary found"
    else
        echo "❌ kaspad binary not found in $RUSTY_KASPA_DIR/target/release/"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "❌ Rusty-Kaspa directory not found: $RUSTY_KASPA_DIR"
    echo "   Clone with: git clone --branch tn12 https://github.com/kaspanet/rusty-kaspa.git"
    ERRORS=$((ERRORS + 1))
fi

# Check mining address
if [ -z "$MINING_ADDRESS" ]; then
    echo "❌ MINING_ADDRESS is not set in config.env"
    echo "   Edit config.env and set MINING_ADDRESS"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Mining address set: ${MINING_ADDRESS:0:20}..."
fi

# Check/create log directory
LOG_DIR=$(dirname "$KASPAD_LOG")
if [ ! -d "$LOG_DIR" ]; then
    echo "Creating log directory: $LOG_DIR"
    mkdir -p "$LOG_DIR"
fi

echo ""
echo "========================================"
if [ $ERRORS -eq 0 ]; then
    echo "✅ Configuration OK!"
    echo "   Run ./start_tn12_kaspad.sh to start the node"
else
    echo "❌ $ERRORS error(s) found"
    echo "   Please fix the issues above"
fi
echo "========================================"
