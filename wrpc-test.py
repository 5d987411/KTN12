#!/usr/bin/env python3
"""
Kaspa Transaction Sender via wRPC
Uses WebSocket JSON-RPC to submit transactions
"""

import sys
import json
import requests
import websocket

KASPA_API = "https://api-tn12.kaspa.org"
RPC_WS = "ws://localhost:18210/"

def wrpc_call(method, params):
    """Make a wRPC call via WebSocket"""
    ws = websocket.WebSocket()
    ws.connect(RPC_WS, timeout=10)
    
    request = {
        'jsonrpc': '2.0',
        'method': method,
        'params': params,
        'id': 1
    }
    ws.send(json.dumps(request))
    response = ws.recv()
    ws.close()
    
    return json.loads(response)

def get_utxos_via_wrpc(address):
    """Get UTXOs via wRPC"""
    result = wrpc_call('getUTXOsByAddresses', {'addresses': [address]})
    if 'error' in result:
        return {'error': result['error']}
    return result.get('result', {})

def get_balance(address):
    """Get balance from public API"""
    url = f"{KASPA_API}/addresses/{address}/balance"
    resp = requests.get(url, timeout=30)
    data = resp.json()
    return int(data.get('balance', 0)) / 1e8

def get_utxos(address):
    """Get UTXOs from public API (easier than wRPC)"""
    url = f"{KASPA_API}/addresses/{address}/utxos"
    resp = requests.get(url, timeout=30)
    return resp.json()

def submit_transaction_via_wrpc(tx_hex):
    """Submit raw transaction via wRPC"""
    # The transaction needs to be submitted in a specific format
    # This is complex - for now, let's try using rothschild for the actual send
    
    # Alternative: Use the RPC to build and sign, then submit
    # For now, return a message indicating this needs more work
    return {"message": "Use rothschild for sending - wRPC submit needs transaction builder"}

if __name__ == '__main__':
    # Test wRPC connection
    print("Testing wRPC connection...")
    result = wrpc_call('getInfo', {})
    print(json.dumps(result, indent=2))
