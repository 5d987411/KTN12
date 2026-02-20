#!/usr/bin/env python3
"""
Kaspa Transaction Sender using Python kaspa library
Uses PendingTransaction API for simplified workflow
"""

import asyncio
import sys
import json
import requests
from kaspa import RpcClient, Keypair, PrivateKey, Address, create_transactions

KASPA_API = "https://api-tn12.kaspa.org"
RPC_HOST = "127.0.0.1"
RPC_PORT = 16210
NETWORK = "testnet"

def get_utxos(address):
    """Get UTXOs from public API"""
    url = f"{KASPA_API}/addresses/{address}/utxos"
    try:
        resp = requests.get(url, timeout=30)
        return resp.json()
    except Exception as e:
        print(f"Error fetching UTXOs: {e}")
        return []

async def send_transaction(private_key_hex, recipient_address, amount_kas):
    """Send exact amount using Python library"""
    
    amount_sompi = int(amount_kas * 1e8)
    
    # Get private key and derive address
    private_key = PrivateKey(private_key_hex)
    keypair = Keypair.from_private_key(private_key)
    sender_address = str(keypair.to_address(NETWORK))
    
    print(f"Sender: {sender_address}")
    print(f"Recipient: {recipient_address}")
    print(f"Amount: {amount_kas} KAS ({amount_sompi} sompi)")
    
    # Connect to RPC
    rpc = RpcClient()
    await rpc.connect(url=f"{RPC_HOST}:{RPC_PORT}")
    
    try:
        # Get UTXO entries from RPC
        result = await rpc.get_utxos_by_addresses({"addresses": [sender_address]})
        
        if not result or not result.get('entries'):
            return {"error": "No UTXOs found"}
        
        entries = result['entries']
        print(f"Got {len(entries)} UTXO entries")
        
        # Check total balance
        total_balance = sum(int(e['entry']['amount']) for e in entries)
        fee = 10000  # 0.0001 KAS fee
        
        if total_balance < amount_sompi + fee:
            return {"error": f"Insufficient funds: have {total_balance/1e8} KAS, need {(amount_sompi + fee)/1e8} KAS"}
        
        # Create payment outputs as dicts
        outputs = [{"address": recipient_address, "amount": amount_sompi}]
        
        # Create Address object for change
        change_addr = Address(sender_address)
        
        # Create transactions using the high-level API
        pending_tx = create_transactions(
            network_id=NETWORK,
            entries=entries,
            change_address=change_addr,
            outputs=outputs,
            priority_fee=fee
        )
        
        print(f"Created pending transaction: {pending_tx.id}")
        print(f"Payment amount: {pending_tx.payment_amount / 1e8} KAS")
        print(f"Fee: {pending_tx.fee_amount / 1e8} KAS")
        
        # Sign transaction
        pending_tx.sign([private_key])
        print(f"Transaction signed")
        
        # Submit
        tx_id = pending_tx.submit(rpc)
        print(f"Transaction submitted! TX ID: {tx_id}")
        
        await rpc.disconnect()
        
        return {
            "success": True,
            "txId": tx_id,
            "amount": amount_kas,
            "recipient": recipient_address
        }
        
    except Exception as e:
        await rpc.disconnect()
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python3 send-tx-exact.py <private_key> <recipient_address> <amount_kas>")
        sys.exit(1)
    
    private_key = sys.argv[1]
    recipient = sys.argv[2]
    amount = float(sys.argv[3])
    
    result = asyncio.run(send_transaction(private_key, recipient, amount))
    print(json.dumps(result))
