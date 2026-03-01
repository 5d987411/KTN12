#!/usr/bin/env python3
"""
Deadman Claim Transaction - Using RPC to get proper sighash and sign
"""
import json
import requests
from kaspa import (
    PrivateKey, Keypair, Address,
    sign_script_hash, pay_to_script_hash_script,
    ScriptBuilder, address_from_script_public_key, ScriptPublicKey,
    pay_to_address_script
)

CONTRACT_ADDRESS = "kaspatest:pz627jycm49m2j54j9u7epkd7cydc7v46zq883peupqq24ejzlsfy2uw8txp3"
BENEFICIARY_PRIVATE_KEY = "190dafc03c70b13cfab2c9d7760936e5f2b359f3efcbfc2a21edb14419d8ebdc"
BENEFICIARY_ADDRESS_STR = "kaspatest:qpgwz2khk48z6037tecfmm96maykaqrsqtf5efej99tfk6c2phvkjl0vzzkjd"
CONTRACT_FILE = "/Users/4dsto/ktn12/deadman_compiled.json"
RPC_URL = "http://127.0.0.1:18210"

def varint(n):
    if n < 0xfd:
        return bytes([n])
    elif n < 0x10000:
        return bytes([0xfd, n & 0xff, (n >> 8) & 0xff])
    elif n < 0x100000000:
        return bytes([0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff])
    else:
        return bytes([0xff, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff,
                     (n >> 32) & 0xff, (n >> 40) & 0xff, (n >> 48) & 0xff, (n >> 56) & 0xff])

def main():
    print("=== Deadman Claim Transaction (RPC-based) ===\n")
    
    with open(CONTRACT_FILE, 'r') as f:
        contract_data = json.load(f)
    
    contract_script = bytes(contract_data['script'])
    print(f"Contract script length: {len(contract_script)}")
    
    # Get UTXOs via RPC
    print("\nFetching UTXOs via RPC...")
    response = requests.post(
        RPC_URL,
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getUtxosByAddresses",
            "params": {"addresses": [CONTRACT_ADDRESS]}
        },
        timeout=30
    )
    result = response.json()
    utxos = result.get('result', {}).get('entries', [])
    print(f"Found {len(utxos)} UTXOs")
    
    if len(utxos) == 0:
        print("No UTXOs found!")
        return
    
    utxo = utxos[0]
    utxo_amount = int(utxo['utxoEntry']['amount'])
    print(f"UTXO amount: {utxo_amount / 1e8} KAS")
    
    # Create beneficiary keypair
    privkey = PrivateKey(BENEFICIARY_PRIVATE_KEY)
    beneficiary_pubkey = privkey.to_public_key()
    beneficiary_pubkey_hex = beneficiary_pubkey.to_string()
    print(f"Beneficiary pubkey: {beneficiary_pubkey_hex}")
    
    # Get beneficiary x-only pubkey
    xonly_pubkey = beneficiary_pubkey.to_x_only_public_key()
    xonly_pubkey_hex = xonly_pubkey.to_string()
    print(f"Beneficiary x-only pubkey: {xonly_pubkey_hex}")
    
    # Compute the P2SH script from the contract
    p2sh_script_public_key = pay_to_script_hash_script(contract_script)
    p2sh_script = p2sh_script_public_key.script
    print(f"\nP2SH script: {p2sh_script}")
    
    # Sign the P2SH script hash with the private key
    signature = sign_script_hash(p2sh_script, privkey)
    print(f"Signature: {signature}")
    
    # Build the signature script (unlocking script)
    # Format for contract with selector: <signature> <selector>
    sig_bytes = bytes.fromhex(signature)
    selector = bytes([1])  # claim entrypoint
    
    sig_script = (
        varint(len(sig_bytes)) + sig_bytes +
        varint(len(selector)) + selector
    )
    sig_script_hex = sig_script.hex()
    print(f"Signature script (hex): {sig_script_hex[:80]}...")
    
    # Calculate fee
    fee = 1000
    send_amount = utxo_amount - fee
    
    # Build output script using 32-byte x-only pubkey (P2PK in Kaspa)
    xonly_pubkey_bytes = bytes.fromhex(xonly_pubkey_hex)
    output_script = bytes([0x20]) + xonly_pubkey_bytes + bytes([0xac])  # OP_PUSHBYTES_32 + 32-byte + OP_CHECKSIG
    output_script_hex = output_script.hex()
    print(f"\nOutput script (hex): {output_script_hex}")
    
    print("\n=== Transaction ===")
    print(f"UTXO: {utxo['outpoint']['transactionId']}:{utxo['outpoint']['index']}")
    print(f"Send amount: {send_amount / 1e8} KAS")
    print(f"To: {BENEFICIARY_ADDRESS_STR}")
    
    # Build transaction JSON for RPC
    tx = {
        "version": 0,
        "inputs": [{
            "previousOutpoint": {
                "transactionId": utxo['outpoint']['transactionId'],
                "index": utxo['outpoint']['index']
            },
            "signatureScript": sig_script_hex,
            "sequence": 0
        }],
        "outputs": [{
            "value": str(send_amount),
            "scriptPublicKey": {
                "version": 0,
                "script": output_script_hex
            }
        }],
        "lockTime": 0,
        "subnetworkId": "00000000000000000000000000000000000000000000000000000000c0ffee00",
        "gas": "0",
        "payload": ""
    }
    
    # Print transaction JSON
    print("\n=== Raw Transaction JSON ===")
    print(json.dumps(tx, indent=2))
    
    # Save to file
    with open('/Users/4dsto/ktn12/claim_tx.json', 'w') as f:
        json.dump(tx, f, indent=2)
    print("\nTransaction saved to claim_tx.json")
    
    return tx


def submit_transaction(tx):
    """Submit transaction via local gRPC"""
    print("\n=== Submitting Transaction ===")
    
    try:
        # Use dashboard API format
        response = requests.post(
            "http://localhost:3001/api/rpc",
            json={
                "method": "submitTransaction", 
                "params": [{"transaction": tx}]
            },
            timeout=30
        )
        print(f"Response: {response.text}")
        return response.json()
    except Exception as e:
        print(f"Error submitting: {e}")
        return {"error": str(e)}


if __name__ == "__main__":
    import sys
    
    # Check for --submit flag
    do_submit = "--submit" in sys.argv
    
    tx = main()
    
    if do_submit:
        submit_transaction(tx)
    else:
        print("\nTo submit, run: python3 deadman_claim.py --submit")
