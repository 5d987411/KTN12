#!/usr/bin/env python3
"""
Deadman Claim Transaction - Using WASM SDK for proper signing
"""
import json
import requests

CONTRACT_ADDRESS = "kaspatest:pz627jycm49m2j54j9u7epkd7cydc7v46zq883peupqq24ejzlsfy2uw8txp3"
BENEFICIARY_PRIVATE_KEY = "190dafc03c70b13cfab2c9d7760936e5f2b359f3efcbfc2a21edb14419d8ebdc"
BENEFICIARY_ADDRESS_STR = "kaspatest:qpgwz2khk48z6037tecfmm96maykaqrsqtf5efej99tfk6c2phvkjl0vzzkjd"
CONTRACT_FILE = "/Users/4dsto/ktn12/deadman_compiled.json"
API_URL = "https://api-tn12.kaspa.org"

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

def get_signature_from_wasm():
    """Use Node.js WASM SDK to sign"""
    import subprocess
    
    script = '''
    const { initKaspaFramework, kaspacore } = require('/Users/4dsto/kaspa-wallet-worker/node_modules/@kaspa/wallet');

    async function sign() {
        await initKaspaFramework();
        
        const { PrivateKey } = kaspacore;
        const { Schnorr } = kaspacore.crypto;
        
        const privKey = new PrivateKey('190dafc03c70b13cfab2c9d7760936e5f2b359f3efcbfc2a21edb14419d8ebdc');
        const pubkey = privKey.toPublicKey();
        
        // The P2SH script
        const p2shScript = 'aa20b4af4898dd4bb54a959179ec86cdf608dc7995d08073c439e04005573217e09287';
        
        // Sign the script hash
        const msg = Buffer.from(p2shScript, 'hex');
        const sig = Schnorr.sign(msg, privKey);
        
        console.log('PUBKEY:' + pubkey.toString());
        console.log('SIGNATURE:' + sig.toString());
    }

    sign().catch(e => { console.error(e.message); process.exit(1); });
    '''
    
    result = subprocess.run(
        ['/Users/4dsto/.nvm/versions/node/v20.20.0/bin/node', '-e', script],
        capture_output=True, text=True, cwd='/Users/4dsto/ktn12'
    )
    
    if result.returncode != 0:
        print("Error:", result.stderr)
        return None, None
    
    pubkey = None
    signature = None
    for line in result.stdout.strip().split('\n'):
        if line.startswith('PUBKEY:'):
            pubkey = line[7:]
        elif line.startswith('SIGNATURE:'):
            signature = line[10:]
    
    return pubkey, signature


def main():
    print("=== Deadman Claim Transaction (WASM Signed) ===\n")
    
    with open(CONTRACT_FILE, 'r') as f:
        contract_data = json.load(f)
    
    contract_script = bytes(contract_data['script'])
    print(f"Contract script length: {len(contract_script)}")
    
    # Get UTXOs via API
    print("\nFetching UTXOs...")
    response = requests.get(f"{API_URL}/addresses/{CONTRACT_ADDRESS}/utxos", timeout=30)
    utxos = response.json()
    print(f"Found {len(utxos)} UTXOs")
    
    if len(utxos) == 0:
        print("No UTXOs found!")
        return
    
    utxo = utxos[0]
    utxo_amount = int(utxo['utxoEntry']['amount'])
    print(f"UTXO amount: {utxo_amount / 1e8} KAS")
    
    # Get signature from WASM SDK
    print("\nSigning with WASM SDK...")
    pubkey_hex, signature_hex = get_signature_from_wasm()
    
    if not signature_hex:
        print("Failed to get signature from WASM")
        return
    
    print(f"Public key: {pubkey_hex}")
    print(f"Signature: {signature_hex[:40]}...")
    
    # The public key from WASM is x-only (32 bytes)
    # We need 33-byte compressed format for the output
    # 50e12ad7... -> 0250e12ad7...
    pubkey_33 = '02' + pubkey_hex
    print(f"Compressed pubkey: {pubkey_33}")
    
    # Build the signature script (unlocking script)
    # Format: <signature> <selector>
    sig_bytes = bytes.fromhex(signature_hex)
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
    xonly_pubkey_bytes = bytes.fromhex(pubkey_hex)
    output_script = bytes([0x20]) + xonly_pubkey_bytes + bytes([0xac])
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
    
    do_submit = "--submit" in sys.argv
    
    tx = main()
    
    if do_submit and tx:
        submit_transaction(tx)
    else:
        print("\nTo submit, run: python3 deadman_claim_wasm.py --submit")
