use clap::Parser;
use kaspa_addresses::{Address, Prefix, Version};
use kaspa_rpc_core::api::rpc::RpcApi;
use kaspa_wrpc_client::{
    KaspaRpcClient, WrpcEncoding,
    client::ConnectOptions,
    prelude::{NetworkId, NetworkType},
};
use secp256k1::{Keypair, Secp256k1};
use std::process::ExitCode;
use std::time::Duration;

#[derive(Parser)]
#[command(name = "kaspa-send")]
#[command(about = "Simple Kaspa TX sender via wRPC", long_about = None)]
struct Cli {
    #[arg(long, default_value = "127.0.0.1:17110")]
    rpc: String,

    #[arg(long, default_value = "testnet-12")]
    network: String,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Parser)]
enum Commands {
    /// Send KAS to an address (prepares transaction)
    Send {
        /// Private key (hex)
        #[arg(long)]
        private_key: String,

        /// Recipient address (kaspatest:...)
        #[arg(long)]
        recipient: String,

        /// Amount in KAS
        #[arg(long)]
        amount: f64,
    },

    /// Check node status
    Status,

    /// Get balance of an address
    Balance {
        /// Address to check
        #[arg(long)]
        address: String,
    },
}

#[tokio::main]
async fn main() -> ExitCode {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Send { private_key, recipient, amount } => send_tx(&cli.rpc, &cli.network, &private_key, &recipient, amount).await,
        Commands::Status => check_status(&cli.rpc, &cli.network).await,
        Commands::Balance { address } => check_balance(&cli.rpc, &cli.network, &address).await,
    };

    match result {
        Ok(msg) => {
            println!("{}", msg);
            ExitCode::SUCCESS
        }
        Err(e) => {
            eprintln!("Error: {}", e);
            ExitCode::FAILURE
        }
    }
}

fn parse_network(network: &str) -> NetworkId {
    match network {
        "mainnet" => NetworkId::new(NetworkType::Mainnet),
        "testnet-10" | "testnet10" => NetworkId::new(NetworkType::Testnet),
        "testnet-12" | "testnet12" => NetworkId::with_suffix(NetworkType::Testnet, 12),
        "devnet" => NetworkId::new(NetworkType::Devnet),
        _ => NetworkId::with_suffix(NetworkType::Testnet, 12),
    }
}

async fn send_tx(
    rpc: &str,
    network: &str,
    private_key: &str,
    recipient: &str,
    amount_kas: f64,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let url = format!("ws://{}", rpc);
    println!("Connecting to {}...", url);

    let network_id = parse_network(network);

    let client = KaspaRpcClient::new(WrpcEncoding::Borsh, Some(url.as_str()), None, Some(network_id), None)?;

    let options =
        ConnectOptions { block_async_connect: true, connect_timeout: Some(Duration::from_millis(10000)), ..Default::default() };

    client.connect(Some(options)).await?;

    println!("Connected! Checking UTXOs...");

    // Parse private key
    let key_bytes = hex::decode(private_key).map_err(|e| format!("Invalid private key hex: {}", e))?;

    if key_bytes.len() != 32 {
        return Err("Private key must be 32 bytes (64 hex chars)".into());
    }

    let _keypair = Keypair::from_seckey_slice(&Secp256k1::new(), &key_bytes).map_err(|e| format!("Invalid private key: {}", e))?;

    // Derive address from keypair
    let xonly = _keypair.x_only_public_key();
    let prefix = match network {
        "mainnet" => Prefix::Mainnet,
        _ => Prefix::Testnet,
    };
    let pubkey_bytes: [u8; 32] = xonly.0.serialize();
    let from_address = Address::new(prefix, Version::PubKey, &pubkey_bytes);
    let from_address_str = from_address.to_string();
    println!("From address: {}", from_address_str);

    // Get UTXOs
    let rpc_address = Address::constructor(&from_address_str);

    let utxos = client.get_utxos_by_addresses(vec![rpc_address]).await.map_err(|e| format!("Failed to get UTXOs: {}", e))?;

    if utxos.is_empty() {
        return Err("No UTXOs available for this address".into());
    }

    println!("Found {} UTXO(s)", utxos.len());

    // Calculate amount in sompi
    let amount_sompi = (amount_kas * 1e8) as u64;
    let mut total_available = 0u64;

    for utxo in &utxos {
        total_available += utxo.utxo_entry.amount;
    }

    println!("Total available: {} sompi ({:.8} KAS)", total_available, total_available as f64 / 1e8);

    if total_available < amount_sompi {
        return Err(format!("Insufficient funds: have {} sompi, need {} sompi", total_available, amount_sompi).into());
    }

    let change_amount = total_available - amount_sompi;

    // For full transaction signing, we need to use an external tool
    // This is because kaspa-txscript signing API is complex
    // For now, let's delegate to the working methods

    println!("Delegating to wallet-cli for signing and broadcast...");

    // Use wallet-cli.sh which has full signing support
    let wallet_cli_cmd = format!("./wallet-cli.sh transfer {} {} {}", private_key, recipient, amount_kas);

    let output = std::process::Command::new("bash")
        .arg("-c")
        .arg(&wallet_cli_cmd)
        .current_dir("/Users/4dsto/ktn12")
        .output()
        .map_err(|e| format!("Failed to run wallet-cli: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    if output.status.success() {
        // Try to extract TXID from output
        let txid_match = stdout.lines().find(|l| l.contains("txid") || l.contains("TX"));

        if let Some(line) = txid_match {
            Ok(format!(
                "Transaction sent successfully!\n\
                 From: {}\n\
                 To: {}\n\
                 Amount: {} KAS\n\
                 \n{}",
                from_address_str, recipient, amount_kas, line
            ))
        } else {
            Ok(format!(
                "Transaction sent!\n\
                 From: {}\n\
                 To: {}\n\
                 Amount: {} KAS\n\
                 \n{}",
                from_address_str, recipient, amount_kas, stdout
            ))
        }
    } else {
        Err(format!("Transaction failed: {}\n{}", stdout, stderr).into())
    }
}

async fn check_status(rpc: &str, network: &str) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let url = format!("ws://{}", rpc);
    println!("Connecting to {}...", url);

    let network_id = parse_network(network);

    let client = KaspaRpcClient::new(WrpcEncoding::Borsh, Some(url.as_str()), None, Some(network_id), None)?;

    let options =
        ConnectOptions { block_async_connect: true, connect_timeout: Some(Duration::from_millis(5000)), ..Default::default() };

    client.connect(Some(options)).await?;

    let info = client.get_block_dag_info().await.map_err(|e| format!("{}", e))?;
    let server_info = client.get_server_info().await.map_err(|e| format!("{}", e))?;

    client.disconnect().await.ok();

    Ok(format!(
        "Node Status:\n\
         - Block count: {}\n\
         - Header count: {}\n\
         - DAA score: {}\n\
         - Synced: {}\n\
         - UTXO indexed: {}\n\
         - Network: {}",
        info.block_count, info.header_count, info.virtual_daa_score, server_info.is_synced, server_info.has_utxo_index, network
    ))
}

async fn check_balance(rpc: &str, network: &str, address: &str) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let url = format!("ws://{}", rpc);
    println!("Connecting to {}...", url);

    let network_id = parse_network(network);

    let client = KaspaRpcClient::new(WrpcEncoding::Borsh, Some(url.as_str()), None, Some(network_id), None)?;

    let options =
        ConnectOptions { block_async_connect: true, connect_timeout: Some(Duration::from_millis(5000)), ..Default::default() };

    client.connect(Some(options)).await?;

    let rpc_address = Address::constructor(address);

    let utxos = client.get_utxos_by_addresses(vec![rpc_address]).await.map_err(|e| format!("Failed to get UTXOs: {}", e))?;

    let mut total = 0u64;
    for utxo in &utxos {
        total += utxo.utxo_entry.amount;
    }

    client.disconnect().await.ok();

    Ok(format!(
        "Address: {}\n\
         UTXOs: {}\n\
         Balance: {} sompi ({:.8} KAS)",
        address,
        utxos.len(),
        total,
        total as f64 / 1e8
    ))
}
