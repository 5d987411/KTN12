pub mod keys {
    use secp256k1::{Error as SecpError, Keypair, Secp256k1};

    pub fn generate_keypair() -> Keypair {
        let secp = Secp256k1::new();
        Keypair::new(&secp, &mut rand::thread_rng())
    }

    pub fn keypair_from_secret(secret: &str) -> Result<Keypair, String> {
        let secp = Secp256k1::new();
        let secret_bytes = hex::decode(secret).map_err(|e| e.to_string())?;
        let secret_key = secp256k1::SecretKey::from_slice(&secret_bytes).map_err(|e: SecpError| e.to_string())?;
        Ok(Keypair::from_secret_key(&secp, &secret_key))
    }
}

pub mod address {
    pub fn public_key_to_address(public_key: &[u8], network: &str) -> Result<String, String> {
        use kaspa_addresses::{Address, Prefix, Version};

        let prefix = match network {
            "mainnet" => Prefix::Mainnet,
            _ => Prefix::Testnet,
        };

        let addr = Address::new(prefix, Version::PubKey, public_key);
        Ok(addr.to_string())
    }
}
