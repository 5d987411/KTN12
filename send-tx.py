#!/usr/bin/env python3
"""
Kaspa Transaction Sender - sends and tries to get TX IDs
"""

import sys
import json
import time
import subprocess

RPC_HOST = "localhost"
RPC_PORT = 16210
ROTHSCHILD = "/Users/4dsto/smartgoo-rusty-kaspa/target/release/rothschild"

def private_key_to_address(private_key):
    """Derive address from private key using rothschild"""
    cmd = f'timeout 3s {ROTHSCHILD} -k {private_key} -s {RPC_HOST}:{RPC_PORT} 2>&1'
    result = subprocess.run(cmd, shell=True, capture_output=True, timeout=5)
    output = result.stdout.decode() + result.stderr.decode()
    
    match = output.lower().find('from address:')
    if match != -1:
        line = output[match:].split('\n')[0]
        parts = line.split()
        if len(parts) >= 3:
            return parts[2]
    
    return None

def send_and_track(private_key, to_address):
    """Send transaction and try to return TX ID"""
    
    # Get sender address
    sender_address = private_key_to_address(private_key)
    if not sender_address:
        return {"error": "Could not derive sender address"}
    
    # Send transaction via rothschild (uses available UTXOs)
    cmd = f'{ROTHSCHILD} -k {private_key} -a {to_address} -s {RPC_HOST}:{RPC_PORT} -t 1'
    
    proc = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Run briefly then kill
    time.sleep(2)
    proc.terminate()
    stdout, stderr = proc.communicate(timeout=3)
    
    output = stdout.decode() + stderr.decode()
    
    # Check for submission in output
    tx_ids = []
    for line in output.split('\n'):
        # Look for transaction submission lines
        line_lower = line.lower()
        if 'submit' in line_lower and 'error' not in line_lower:
            # Try to extract TX ID (typically a long hex string)
            words = line.split()
            for word in words:
                # TX IDs are typically 64+ hex characters
                if len(word) > 50 and all(c in '0123456789abcdefABCDEF' for c in word):
                    tx_ids.append(word)
    
    # Check for errors (dust rejection)
    has_dust_error = 'dust' in output.lower()
    
    if tx_ids:
        return {
            "success": True,
            "txId": tx_ids[0],
            "txIds": tx_ids,
            "message": "Transaction sent"
        }
    elif has_dust_error:
        return {
            "success": False,
            "error": "Transaction rejected (dust). Try sending all funds instead.",
            "message": "Dust error"
        }
    else:
        return {
            "success": True,
            "txId": "check explorer",
            "message": "Sent - check explorer for TX ID"
        }

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 send-tx.py <private_key> <to_address> [amount]")
        sys.exit(1)
    
    private_key = sys.argv[1]
    to_address = sys.argv[2]
    
    result = send_and_track(private_key, to_address)
    print(json.dumps(result))
