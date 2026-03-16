#!/usr/bin/env python3
"""
Kaspa Wallet Script for AI Agent
Based on openclaw-alpha kaspa-wallet skill

Usage:
    python kaspa_wallet.py create
    python kaspa_wallet.py balance <address>
    python kaspa_wallet.py send <private_key> <to_address> <amount>
    python kaspa_wallet.py swap <private_key> <to_address> <amount> --rate <exchange_rate>
"""

import argparse
import asyncio
import json
import sys
import os

try:
    from kaspa import Mnemonic, XPrv, PrivateKeyGenerator, Address, RpcClient, Resolver, Generator, PaymentOutput, PrivateKey, PublicKey
except ImportError:
    print("Error: kaspa package not installed.")
    print("Install with: pip install kaspa")
    sys.exit(1)


NETWORK = "testnet"
NETWORK_ID = "testnet-12"


async def create_wallet():
    """Generate a new Kaspa wallet"""
    mnemonic = Mnemonic.random()
    seed = mnemonic.to_seed()
    xprv = XPrv(seed)
    xprv_str = xprv.to_string()
    
    key_gen = PrivateKeyGenerator(xprv_str, False, 0)
    private_key = key_gen.receive_key(0)
    address = private_key.to_address(NETWORK)
    
    result = {
        "mnemonic": mnemonic.phrase,
        "xprv": xprv_str,
        "private_key": private_key.to_string(),
        "address": address.to_string()
    }
    
    print(json.dumps(result, indent=2))
    return result


async def check_balance(address: str):
    """Check balance of a Kaspa address"""
    client = RpcClient(resolver=Resolver(), network_id=NETWORK_ID)
    await client.connect()
    try:
        result = await client.get_balance_by_address({"address": address})
        balance_sompi = result.get("balance", 0)
        balance_kas = balance_sompi / 100_000_000
        return {"address": address, "balance_kas": balance_kas, "balance_sompi": balance_sompi}
    finally:
        await client.disconnect()


async def get_utxos(address: str):
    """Get UTXOs for an address"""
    client = RpcClient(resolver=Resolver(), network_id=NETWORK_ID)
    await client.connect()
    try:
        utxos = await client.get_utxos_by_addresses({"addresses": [address]})
        return {"address": address, "utxos": utxos.get("entries", [])}
    finally:
        await client.disconnect()


async def send_kas(sender_key: str, recipient_addr: str, amount_kas: float):
    """Send KAS to a recipient"""
    amount_sompi = int(amount_kas * 100_000_000)
    
    private_key = PrivateKey(sender_key)
    sender_address = private_key.to_public_key().to_address(NETWORK).to_string()
    
    client = RpcClient(resolver=Resolver(), network_id=NETWORK_ID)
    await client.connect()
    
    try:
        # Get UTXOs
        utxos = await client.get_utxos_by_addresses({"addresses": [sender_address]})
        
        if not utxos.get("entries"):
            return {"error": "No UTXOs found - insufficient balance"}
        
        recipient = Address(recipient_addr)
        sender = Address(sender_address)
        
        # Create transaction
        generator = Generator(
            network_id=NETWORK_ID,
            entries=utxos["entries"],
            change_address=sender,
            outputs=[PaymentOutput(recipient, amount_sompi)],
            sig_op_count=1,
            priority_fee=0,
        )
        
        # Sign and submit
        tx_ids = []
        for pending_tx in generator:
            pending_tx.sign([private_key])
            tx_id = await pending_tx.submit(client)
            tx_ids.append(str(tx_id))
        
        return {
            "success": True,
            "tx_ids": tx_ids,
            "amount_kas": amount_kas,
            "sender": sender_address,
            "recipient": recipient_addr
        }
    finally:
        await client.disconnect()


async def deploy_htlc(sender_key: str, hashlock: str, timelock: int, recipient_addr: str, amount_kas: float):
    """
    Deploy an HTLC contract on Kaspa
    This is a placeholder - actual implementation would use Silverscript compiled contracts
    """
    amount_sompi = int(amount_kas * 100_000_000)
    
    private_key = PrivateKey(sender_key)
    sender_address = private_key.to_public_key().to_address(NETWORK).to_string()
    
    # In a full implementation, this would:
    # 1. Compile the Silverscript HTLC contract
    # 2. Create the contract address with constructor args (hashlock, timelock, recipient)
    # 3. Fund the contract with the specified amount
    
    return {
        "success": True,
        "htlc_type": "kaspa_htlc",
        "hashlock": hashlock,
        "timelock": timelock,
        "recipient": recipient_addr,
        "amount_kas": amount_kas,
        "sender": sender_address,
        "message": "HTLC deployment placeholder - requires Silverscript compilation"
    }


async def claim_htlc(sender_key: str, htlc_address: str, preimage: str):
    """
    Claim funds from an HTLC using the preimage
    """
    return {
        "success": True,
        "htlc_address": htlc_address,
        "preimage": preimage,
        "message": "HTLC claim placeholder - requires contract interaction"
    }


async def refund_htlc(sender_key: str, htlc_address: str):
    """
    Refund funds from an HTLC after timelock expiry
    """
    return {
        "success": True,
        "htlc_address": htlc_address,
        "message": "HTLC refund placeholder - requires contract interaction"
    }


def main():
    parser = argparse.ArgumentParser(description="Kaspa Wallet for AI Agent")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Create wallet
    subparsers.add_parser("create", help="Create new wallet")
    
    # Check balance
    balance_parser = subparsers.add_parser("balance", help="Check balance")
    balance_parser.add_argument("address", help="Kaspa address")
    
    # Get UTXOs
    utxo_parser = subparsers.add_parser("utxos", help="Get UTXOs")
    utxo_parser.add_argument("address", help="Kaspa address")
    
    # Send KAS
    send_parser = subparsers.add_parser("send", help="Send KAS")
    send_parser.add_argument("private_key", help="Sender private key (hex)")
    send_parser.add_argument("to", help="Recipient address")
    send_parser.add_argument("amount", type=float, help="Amount in KAS")
    
    # Deploy HTLC
    htlc_parser = subparsers.add_parser("deploy-htlc", help="Deploy HTLC")
    htlc_parser.add_argument("private_key", help="Sender private key (hex)")
    htlc_parser.add_argument("hashlock", help="Hashlock (SHA256 of preimage)")
    htlc_parser.add_argument("timelock", type=int, help="Timelock in seconds")
    htlc_parser.add_argument("recipient", help="Recipient address")
    htlc_parser.add_argument("amount", type=float, help="Amount in KAS")
    
    # Claim HTLC
    claim_parser = subparsers.add_parser("claim-htlc", help="Claim HTLC")
    claim_parser.add_argument("private_key", help="Claimer private key (hex)")
    claim_parser.add_argument("htlc_address", help="HTLC contract address")
    claim_parser.add_argument("preimage", help="Preimage to unlock funds")
    
    # Refund HTLC
    refund_parser = subparsers.add_parser("refund-htlc", help="Refund HTLC")
    refund_parser.add_argument("private_key", help="Refunder private key (hex)")
    refund_parser.add_argument("htlc_address", help="HTLC contract address")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Execute command
    if args.command == "create":
        result = asyncio.run(create_wallet())
    elif args.command == "balance":
        result = asyncio.run(check_balance(args.address))
    elif args.command == "utxos":
        result = asyncio.run(get_utxos(args.address))
    elif args.command == "send":
        result = asyncio.run(send_kas(args.private_key, args.to, args.amount))
    elif args.command == "deploy-htlc":
        result = asyncio.run(deploy_htlc(args.private_key, args.hashlock, args.timelock, args.recipient, args.amount))
    elif args.command == "claim-htlc":
        result = asyncio.run(claim_htlc(args.private_key, args.htlc_address, args.preimage))
    elif args.command == "refund-htlc":
        result = asyncio.run(refund_htlc(args.private_key, args.htlc_address))
    else:
        print(f"Unknown command: {args.command}")
        sys.exit(1)
    
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
