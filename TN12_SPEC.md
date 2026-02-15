# Kaspa TN12 Developer Specs

## Network Configuration

| Parameter | Value |
|-----------|-------|
| Network | Kaspa Testnet-12 |
| Testnet Prefix | `kaspatest:` |
| Mainnet Prefix | `kaspa:` |
| RPC Port | 16210 |
| P2P Port | 16311 |
| gRPC Port | 16211 |

## Address Format

### Bech32m Encoding

Kaspa uses **Bech32m** encoding for all addresses (mainnet and testnet).

**Format:** `<prefix>:<address_data>`

| Network | Prefix | Example |
|---------|--------|---------|
| Testnet-12 | `kaspatest:` | `kaspatest:qz8gj4270088uyl6y0vu6wa8gaq92pam9ydnqwmxucctzg3a8wnq2v7zdzy7f` |
| Mainnet | `kaspa:` | `kaspa:qq2efzv0j7vt9gz9gfq44e6ggemjvvcuewhzqpm4ekf4fs5smruvs3c8ur9rp` |

### Address Construction

1. **X-only Public Key**: 32 bytes (secp256k1 X coordinate only, no Y)
2. **Payload**: Version (1 byte, value=0) + X-only pubkey (32 bytes) = 33 bytes
3. **Encoding**: Bech32m with 6-byte checksum

### Key Hash (for Smart Contracts)

The contract stores `blake2b(x-only-pubkey)` - a 32-byte hash of the x-only public key.

```python
# Python example
import hashlib
xonly_pubkey = bytes.fromhex("8e89555e7bce7e13fa23d9cd3ba747405507bb291b303b66e630b1223d3ba605")
key_hash = hashlib.blake2b(xonly_pubkey, digest_size=32).hexdigest()
# Result: a70cc8d02e0ac01d1f030a1703e52ce7d3ede4acd9ee2cfed531a01c94e6a65a
```

## Key Generation

### secp256k1 Keypair

1. Generate secp256k1 private key (32 bytes)
2. Derive public key (65 bytes uncompressed: 04 + X + Y)
3. Extract X-only pubkey (32 bytes - last 32 bytes)
4. Compute Bech32m address

### Public Key Formats

| Format | Length | Example |
|--------|--------|---------|
| Uncompressed | 130 hex chars (65 bytes) | `04...` |
| Compressed (even Y) | 66 hex chars (33 bytes) | `02...` |
| Compressed (odd Y) | 66 hex chars (33 bytes) | `03...` |
| X-only | 64 hex chars (32 bytes) | `8e89555e...` |

### Generate Keys (Python/OpenSSL)

```python
import subprocess
import base64

# Generate private key
priv_proc = subprocess.Popen(
    ["openssl", "ecparam", "-genkey", "-name", "secp256k1"],
    stdout=subprocess.PIPE
)
priv_pem, _ = priv_proc.communicate()

# Extract private key bytes from PEM/DER
# ... (see server.py for full implementation)

# Generate public key
pub_proc = subprocess.Popen(
    ["openssl", "ec", "-pubout"],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE
)
pub_pem, _ = pub_proc.communicate(input=priv_pem)

# Extract x-only pubkey and create Bech32m address
# ... (see server.py for full implementation)
```

## Node Connections

### RPC Connection (Python)

```python
import subprocess

# Check if node is running
result = subprocess.run(
    ["lsof", "-i", ":16210"],
    capture_output=True, text=True
)
is_running = "kaspad" in result.stdout
```

### gRPC Connection (Python)

```python
import grpc

channel = grpc.insecure_channel('localhost:16211')
stub = kaspa_grpc_pb2_grpc.KaspaRpcStub(channel)
```

### Connect via CLI

```bash
# RPC
nc localhost 16210

# Check ports
lsof -i :16210  # RPC
lsof -i :16211  # gRPC
lsof -i :16311  # P2P
```

## Deployment Commands

### Start Node

```bash
cd /Users/4dsto/kaspa-node/kaspa-testnet-12-main
./start_tn12.sh
```

### Check Status

```bash
./check_status.sh
```

### Deploy Contract

```bash
cd /Users/4dsto/kaspa-node/kaspa-testnet-12-main

# Compile contract
silverc deadman_switch.sil --constructor-args deadman_args.json

# Deploy
./deploy_live.sh <contract_name>
```

## Smart Contract (Deadman Switch)

### Contract Parameters

```sil
contract DeadmanSwitch(
    pubkey owner,           // Owner public key
    pubkey beneficiary,    // Beneficiary public key
    int timeoutPeriod      // Timeout in seconds
)
```

### Entrypoints

| Function | Description | Caller |
|----------|-------------|--------|
| `heartbeat()` | Reset timer | Owner |
| `claim()` | Claim funds after timeout | Beneficiary |
| `cancel()` | Cancel and recover funds | Owner |

### Constructor Args Format

```json
[
  {"kind": "bytes", "data": [...]},
  {"kind": "bytes", "data": [...]},
  {"kind": "int", "data": 31536000}
]
```

## Wallet Integration

### Rothschild (CLI Wallet)

```bash
# Start with private key
./rothschild -k <private_key_hex>

# Check balance (sends 0 tps, just shows info)
./rothschild -t 0
```

### Dashboard

```bash
# Start dashboard
cd /Users/4dsto/kaspa-node/dashboard
python3 server.py

# Access
http://localhost:8080
http://localhost:8080/deadman
```

## Common Issues

### Address Not Valid

- Ensure using `kaspatest:` prefix for TN12
- Check address is valid Bech32m format (62 chars after colon)

### Node Not Connecting

- Check firewall allows ports 16210, 16211, 16311
- Ensure `kaspad` is running: `lsof -i :16210`

### Contract Deployment Fails

- Ensure UTXOs in wallet
- Check node is fully synced
- Verify constructor args format

## File Locations

| File | Path |
|------|------|
| Node Data | `~/.kaspad/testnet12` |
| Logs | `/tmp/kaspad_tn12.log` |
| PID | `/tmp/kaspad.pid` |
| Dashboard | `/Users/4dsto/kaspa-node/dashboard/` |
| Contracts | `/Users/4dsto/kaspa-node/*.sil` |
