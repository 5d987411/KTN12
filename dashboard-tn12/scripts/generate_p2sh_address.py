#!/usr/bin/env python3
import sys
import json
from kaspa import address_from_script_public_key, pay_to_script_hash_script

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: generate_p2sh_address.py <script_hex_or_json_file>'}))
        sys.exit(1)
    
    try:
        arg = sys.argv[1]
        
        # Check if it's a file path
        if arg.endswith('.json'):
            with open(arg) as f:
                data = json.load(f)
                script = bytes(data.get('script', []))
        else:
            # Treat as hex string
            script = bytes.fromhex(arg)
        
        if not script:
            print(json.dumps({'error': 'No script found'}))
            sys.exit(1)
        
        p2sh_script = pay_to_script_hash_script(script)
        addr = address_from_script_public_key(p2sh_script, 'testnet')
        
        print(json.dumps({
            'address': addr.to_string()
        }))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
