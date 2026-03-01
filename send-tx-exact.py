#!/usr/bin/env python3
"""
Kaspa Transaction Sender using Python kaspa library
Uses WebSocket RPC (port 18210) and public API for UTXOs
"""

import asyncio
import sys
import json
import requests
from kaspa import RpcClient, Keypair, PrivateKey, Address, create_transactions

KASPA_API = "https://api-tn12.kaspa.org"
RPC_WS = "ws://127.0.0.1:18210"
NETWORK = "testnet"

def get_utxos_from_api(address):
    """Get UTXOs from public API and convert to entries format"""
    url = f"{KASPA_API}/addresses/{address}/utxos"
    try:
        resp = requests.get(url, timeout=30)
        utxos = resp.json()
        
        # Convert API format to create_transactions format
        entries = []
        for u in utxos:
            entry = {
                'outpoint': {
                    'transactionId': u['outpoint']['transactionId'],
                    'index': u['outpoint']['index']
                },
                'signatureScript': u['utxoEntry']['scriptPublicKey']['scriptPublicKey'],
                'amount': int(u['utxoEntry']['amount']),
                'blockDAAScore': int(u['utxoEntry']['blockDaaScore'])
            }
            entries.append(entry)
        return entries
    except Exception as e:
        print(f"Error fetching UTXOs: {e}")
        return []

async def send_transaction(private_key_hex, recipient_address, amount_kas):
    """Send exact amount using Python library with WebSocket RPC"""
    
    amount_sompi = int(amount_kas * 1e8)
    
    # Get private key and derive address
    private_key = PrivateKey(private_key_hex)
    keypair = Keypair.from_private_key(private_key)
    sender_address = keypair.to_address(NETWORK).to_string()
    
    print(f"Sender: {sender_address}")
    print(f"Recipient: {recipient_address}")
    print(f"Amount: {amount_kas} KAS ({amount_sompi} sompi)")
    
    # Get UTXOs from public API
    entries = get_utxos_from_api(sender_address)
    
    if not entries:
        return {"error": "No UTXOs found"}
    
    print(f"Got {len(entries)} UTXOs")
    
    # Check total balance
    total_balance = sum(e['amount'] for e in entries)
    fee = 1000  # 0.00001 KAS minimum fee
    
    if total_balance < amount_sompi + fee:
        return {"error": f"Insufficient funds: have {total_balance/1e8} KAS, need {(amount_sompi + fee)/1e8} KAS"}
    
    # Connect to RPC via WebSocket
    rpc = RpcClient()
    await rpc.connect(url=RPC_WS)
    
    try:
        # Create payment outputs
        outputs = [{"address": recipient_address, "amount": amount_sompi}]
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
