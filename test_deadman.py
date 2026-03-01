#!/usr/bin/env python3
"""
Deadman Switch Contract Test
"""

import json
import requests

KASPA_API = "https://api-tn12.kaspa.org"
CONTRACT_FILE = "/Users/4dsto/ktn12/deadman_compiled.json"
CONTRACT_ADDRESS = "kaspatest:pz627jycm49m2j54j9u7epkd7cydc7v46zq883peupqq24ejzlsfy2uw8txp3"

def main():
    # Load contract
    with open(CONTRACT_FILE, 'r') as f:
        contract = json.load(f)
    
    print("=== Deadman Switch Contract ===")
    print(f"Name: {contract['contract_name']}")
    print(f"Script size: {len(contract['script'])} bytes")
    print(f"\nEntrypoints:")
    for abi in contract['abi']:
        inputs = ', '.join([f"{i['name']}:{i['type_name']}" for i in abi['inputs']]) or "()"
        print(f"  - {abi['name']}({inputs})")
    
    # Check contract state
    resp = requests.get(f"{KASPA_API}/addresses/{CONTRACT_ADDRESS}/utxos", timeout=30)
    utxos = resp.json()
    
    if utxos:
        utxo = utxos[0]
        amount = int(utxo['utxoEntry']['amount'])
        print(f"\nContract State:")
        print(f"  Balance: {amount/1e8} KAS")
        print(f"  UTXO age: {utxo['utxoEntry']['blockDaaScore']} blocks")
        
        # Check if claimable
        # The timeout is 600 blocks
        current_daa_resp = requests.post("http://localhost:3001/api/rpc", 
            json={"method": "get_block_dag_info", "params": []}, timeout=10)
        current_daa = current_daa_resp.json().get('virtualDaaScore', '0')
        if isinstance(current_daa, str):
            current_daa = int(current_daa)
        utxo_daa = int(utxo['utxoEntry']['blockDaaScore'])
        age = current_daa - utxo_daa
        
        print(f"  Current DAA: {current_daa}")
        print(f"  Age: {age} blocks")
        print(f"  Timeout: 600 blocks (~10 min)")
        print(f"  Can claim: {'YES' if age >= 600 else 'NO'}")
        
        print("\n=== Test Options ===")
        print("1. heartbeat - Reset timer (owner must sign)")
        print("2. cancel - Recover funds (owner must sign)")  
        print("3. claim - Claim funds (beneficiary after timeout)")
        print("\nTo call entrypoints, need to build P2SH spending transaction.")
        print("This requires proper SDK with contract script execution.")
    else:
        print("\nNo UTXOs - contract not funded!")

if __name__ == "__main__":
    main()
