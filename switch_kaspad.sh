#!/bin/bash
# Switch between kaspad versions
# Note: covpp-reset2 has a panic bug, tn12 is the working version

VERSION=$1
KASPAD_DIR="/Users/4dsto/rusty-kaspa-tn12/target/release"

stop_kaspad() {
    pkill -f "kaspad.*netsuffix=12" 2>/dev/null
    sleep 2
}

start_kaspad() {
    cd "$KASPAD_DIR"
    nohup ./kaspad --testnet --netsuffix=12 --utxoindex --rpclisten=127.0.0.1:16210 --rpclisten-json=127.0.0.1:18210 --rpclisten-borsh=127.0.0.1:17210 --unsaferpc --enable-unsynced-mining --listen=0.0.0.0:16311 --addpeer=23.118.8.168 --appdir /Users/4dsto/.kaspa-testnet12-tn12 > /Users/4dsto/ktn12/kaspad.log 2>&1 &
    sleep 3
    if pgrep -f "kaspad.*netsuffix=12" > /dev/null; then
        echo "kaspad started successfully"
    else
        echo "Failed to start kaspad"
    fi
}

if [ "$VERSION" = "tn12" ] || [ "$VERSION" = "1" ]; then
    echo "Switching to tn12 (working version)..."
    cp "$KASPAD_DIR/kaspad_covpp1" "$KASPAD_DIR/kaspad"
    stop_kaspad
    start_kaspad
elif [ "$VERSION" = "covpp2" ] || [ "$VERSION" = "2" ]; then
    echo "WARNING: covpp-reset2 has a panic bug and may not work!"
    if [ -f "$KASPAD_DIR/kaspad_covpp2" ]; then
        cp "$KASPAD_DIR/kaspad_covpp2" "$KASPAD_DIR/kaspad"
        stop_kaspad
        start_kaspad
    else
        echo "covpp2 binary not built yet"
    fi
else
    echo "Usage: ./switch_kaspad.sh [tn12|covpp2]"
    echo "  tn12   - Working version (default)"
    echo "  covpp2 - covpp-reset2 branch (has panic bug)"
    echo ""
    CURRENT=$(ls -la "$KASPAD_DIR/kaspad" 2>/dev/null | awk '{print $NF}')
    echo "Current: $CURRENT"
    exit 1
fi
