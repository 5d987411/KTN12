#!/bin/bash
# Kaspa Testnet 12 - Quick Reference
# Run this to see all important commands

cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║         KASPA TESTNET 12 - QUICK REFERENCE CARD                  ║
╚══════════════════════════════════════════════════════════════════╝

📁 DIRECTORIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Silverscript:  /home/cliff/silverscript
  Kaspa Node:    /home/cliff/rusty-kaspa
  Deployments:   /home/cliff/silverscript/deployments

🔧 ESSENTIAL COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check Status:
  cd /home/cliff/silverscript && ./check_status.sh

Setup Wallet:
  cd /home/cliff/silverscript && ./setup_deployment.sh

Start Node:
  cd /home/cliff/rusty-kaspa
  ./target/release/kaspad --testnet --netsuffix=12 --utxoindex

Deploy Contract:
  cd /home/cliff/silverscript
  ./deploy_contract.sh p2pkh <private-key>

📋 COMPILED CONTRACTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • p2pkh                  (45 bytes)  - Basic payment
  • transfer_with_timeout  (108 bytes) - Time-locked transfer
  • escrow                 (~100 bytes) - Arbiter escrow
  • mecenas                (~200 bytes) - Recurring payments
  • hodl_vault             (162 bytes) - Oracle vault
  • bar                    (~50 bytes)  - Multi-function

💰 GET TESTNET COINS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Faucet:   https://faucet-tn12.kaspanet.io
  Discord:  https://discord.gg/kaspa (#testnet channel)

📖 DOCUMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Full Guide:     cat /home/cliff/silverscript/DEPLOYMENT_GUIDE.md
  Setup Summary:  cat /home/cliff/silverscript/SETUP_SUMMARY.md
  Tutorial:       cat /home/cliff/silverscript/TUTORIAL.md

🔌 NETWORK INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Network:     Testnet 12
  P2P Port:    16311
  RPC Port:    16210
  Branch:      tn12

⚠️  IMPORTANT NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  • Contracts work on Testnet 12 ONLY
  • Do NOT deploy to mainnet
  • Keep private keys secure
  • Testnet coins have no value

🚀 QUICK START
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. ./check_status.sh
  2. ./setup_deployment.sh (if needed)
  3. Start node (see above)
  4. Get coins from faucet
  5. ./deploy_contract.sh <contract> <key>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For detailed instructions: cat DEPLOYMENT_GUIDE.md
EOF
