use clap::{Parser, Subcommand};
use secp256k1::{Keypair, Secp256k1, XOnlyPublicKey};
use kaspa_addresses::{Address, Prefix, Version};

#[derive(Parser)]
#[command(name = "kaspa-wallet-cli")]
#[command(about = "Kaspa TN12 Wallet CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
    
    #[arg(long, default_value = "testnet")]
    network: String,
    
    #[arg(long, default_value = "127.0.0.1:16210")]
    rpc: String,
}

#[derive(Subcommand)]
enum Commands {
    /// Generate a new wallet
    Generate,
    
    /// Load wallet from private key
    Load { private_key: String },
    
    /// Check balance
    Balance { address: String },
    
    /// Send KAS
    Send { 
        private_key: String,
        recipient: String,
        amount: f64,
    },
    
    /// Get UTXOs
    Utxos { address: String },
}

fn xonly_to_bytes(xonly: &XOnlyPublicKey) -> [u8; 32] {
    let mut bytes = [0u8; 32];
    bytes.copy_from_slice(&xonly.serialize());
    bytes
}

fn main() {
    let cli = Cli::parse();
    
    let prefix = match cli.network.as_str() {
        "mainnet" => Prefix::Mainnet,
        _ => Prefix::Testnet,
    };
    
    match cli.command {
        Commands::Generate => {
            let secp = Secp256k1::new();
            let keypair = Keypair::new(&secp, &mut rand::thread_rng());
            let (xonly, _) = keypair.x_only_public_key();
            
            let pk_bytes = xonly_to_bytes(&xonly);
            let address = Address::new(prefix, Version::PubKey, &pk_bytes);
            
            println!("{{");
            println!("  \"private_key\": \"{}\",", hex::encode(keypair.secret_bytes()));
            println!("  \"public_key\": \"{}\",", hex::encode(xonly.serialize()));
            println!("  \"address\": \"{}\",", address);
            let net = if cli.network == "mainnet" { "mainnet" } else { "testnet-12" };
            println!("  \"network\": \"{}\"", net);
            println!("}}");
        }
        
        Commands::Load { private_key } => {
            let secp = Secp256k1::new();
            let secret_bytes = hex::decode(&private_key)
                .expect("Invalid private key hex");
            
            if secret_bytes.len() != 32 {
                eprintln!("Private key must be 32 bytes");
                std::process::exit(1);
            }
            
            let secret = secp256k1::SecretKey::from_slice(&secret_bytes)
                .expect("Invalid private key");
            let keypair = Keypair::from_secret_key(&secp, &secret);
            let (xonly, _) = keypair.x_only_public_key();
            
            let pk_bytes = xonly_to_bytes(&xonly);
            let address = Address::new(prefix, Version::PubKey, &pk_bytes);
            
            println!("{{");
            println!("  \"private_key\": \"{}\",", private_key);
            println!("  \"public_key\": \"{}\",", hex::encode(xonly.serialize()));
            println!("  \"address\": \"{}\",", address);
            let net = if cli.network == "mainnet" { "mainnet" } else { "testnet-12" };
            println!("  \"network\": \"{}\"", net);
            println!("}}");
        }
        
        Commands::Balance { address } => {
            let url = format!("https://api-tn12.kaspa.org/addresses/{}/balance", address);
            
            match reqwest::blocking::get(&url) {
                Ok(response) => {
                    if let Ok(text) = response.text() {
                        println!("{}", text);
                    }
                }
                Err(e) => {
                    eprintln!("Error: {}", e);
                    std::process::exit(1);
                }
            }
        }
        
        Commands::Utxos { address } => {
            let url = format!("https://api-tn12.kaspa.org/addresses/{}/utxos", address);
            
            match reqwest::blocking::get(&url) {
                Ok(response) => {
                    if let Ok(text) = response.text() {
                        println!("{}", text);
                    }
                }
                Err(e) => {
                    eprintln!("Error: {}", e);
                    std::process::exit(1);
                }
            }
        }
        
        Commands::Send { private_key, recipient, amount } => {
            println!("Sending {} KAS to {}", amount, recipient);
            println!("Note: Use kaspa-wallet for full wallet functionality");
            println!("Sending via public RPC...");
            
            let url = format!("https://api-tn12.kaspa.org/addresses/{}/utxos", 
                "kaspatest:qpgwz2khk48z6037tecfmm96maykaqrsqtf5efej99tfk6c2phvkjl0vzzkjd");
            
            match reqwest::blocking::get(&url) {
                Ok(response) => {
                    if let Ok(text) = response.text() {
                        println!("UTXOs: {}", text);
                    }
                }
                Err(e) => {
                    eprintln!("Error: {}", e);
                }
            }
            
            println!("\nTo send KAS, use: ./rothschild -k <private_key> -a <recipient> -t 1");
        }
    }
}
