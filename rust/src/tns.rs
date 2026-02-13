use alloy::{
    primitives::{Address, FixedBytes, keccak256},
    providers::DynProvider,
    sol,
};
use alloy_network::Ethereum;
use tracing::debug;

sol! {
    #[sol(rpc)]
    interface TNSRegistry {
        function resolver(bytes32 node) external view returns (address);
        function owner(bytes32 node) external view returns (address);
    }

    #[sol(rpc)]
    interface TNSResolver {
        function addr(bytes32 node) external view returns (address);
        function name(bytes32 node) external view returns (string);
        function text(bytes32 node, string key) external view returns (string);
        function contenthash(bytes32 node) external view returns (bytes);
    }
}

pub const TNS_REGISTRY_ADDRESS: &str = "0x34D7648aecc10fd86A53Cdd2436125342f3d7412";
pub const TNS_RESOLVER_ADDRESS: &str = "0x17Adb57047EDe9eBA93A5855f8578A8E512592C5";
pub const INTUITION_RPC_URL: &str = "https://intuition.calderachain.xyz";
pub const INTUITION_CHAIN_ID: u64 = 1155;

#[derive(Clone, Debug)]
pub struct Tns {
    pub name: Option<String>,
    pub address: Option<Address>,
    pub avatar: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum TnsError {
    #[error("Contract call failed: {0}")]
    ContractError(String),
    #[error("Invalid address: {0}")]
    InvalidAddress(String),
    #[error("HTTP request failed: {0}")]
    HttpError(#[from] reqwest::Error),
}

impl Tns {
    fn namehash(name: &str) -> Vec<u8> {
        if name.is_empty() {
            return vec![0u8; 32];
        }
        let mut hash = vec![0u8; 32];
        for label in name.rsplit('.') {
            hash.append(&mut keccak256(label.as_bytes()).to_vec());
            hash = keccak256(hash.as_slice()).to_vec();
        }
        hash
    }

    pub async fn resolve_name(
        name: &str,
        registry: &TNSRegistry::TNSRegistryInstance<DynProvider, Ethereum>,
    ) -> Result<Tns, TnsError> {
        let full_name = if name.ends_with(".trust") {
            name.to_string()
        } else {
            format!("{}.trust", name)
        };

        let node = Self::namehash(&full_name);
        let node_bytes = FixedBytes::from_slice(node.as_slice());

        let resolver_address = registry
            .resolver(node_bytes)
            .call()
            .await
            .map_err(|e| TnsError::ContractError(e.to_string()))?;

        if resolver_address == Address::ZERO {
            debug!("No resolver found for {}", full_name);
            return Ok(Tns {
                name: Some(full_name),
                address: None,
                avatar: None,
            });
        }

        let resolver = TNSResolver::TNSResolverInstance::new(resolver_address, registry.provider());

        let addr = resolver
            .addr(node_bytes)
            .call()
            .await
            .map_err(|e| TnsError::ContractError(e.to_string()))?;

        let avatar = resolver
            .text(node_bytes, "avatar".to_string())
            .call()
            .await
            .ok()
            .filter(|s| !s.is_empty());

        debug!("Resolved {}: addr={}, avatar={:?}", full_name, addr, avatar);

        Ok(Tns {
            name: Some(full_name),
            address: if addr != Address::ZERO { Some(addr) } else { None },
            avatar,
        })
    }

    pub async fn reverse_resolve(
        address: Address,
        registry: &TNSRegistry::TNSRegistryInstance<DynProvider, Ethereum>,
    ) -> Result<Tns, TnsError> {
        debug!("Reverse resolving TNS name for {}", address);

        let reverse_name = Self::prepare_reverse_name(address);
        let node = Self::namehash(&reverse_name);
        let node_bytes = FixedBytes::from_slice(node.as_slice());

        let resolver_address = registry
            .resolver(node_bytes)
            .call()
            .await
            .map_err(|e| TnsError::ContractError(e.to_string()))?;

        if resolver_address == Address::ZERO {
            debug!("No reverse resolver found for {}", address);
            return Ok(Tns {
                name: None,
                address: Some(address),
                avatar: None,
            });
        }

        let resolver = TNSResolver::TNSResolverInstance::new(resolver_address, registry.provider());

        let name = resolver
            .name(node_bytes)
            .call()
            .await
            .map_err(|e| TnsError::ContractError(e.to_string()))?;

        if name.is_empty() {
            return Ok(Tns {
                name: None,
                address: Some(address),
                avatar: None,
            });
        }

        let avatar = Self::get_avatar(&name, registry).await?;

        debug!("Reverse resolved {}: name={}, avatar={:?}", address, name, avatar);

        Ok(Tns {
            name: Some(name),
            address: Some(address),
            avatar,
        })
    }

    async fn get_avatar(
        name: &str,
        registry: &TNSRegistry::TNSRegistryInstance<DynProvider, Ethereum>,
    ) -> Result<Option<String>, TnsError> {
        let full_name = if name.ends_with(".trust") {
            name.to_string()
        } else {
            format!("{}.trust", name)
        };

        let node = Self::namehash(&full_name);
        let node_bytes = FixedBytes::from_slice(node.as_slice());

        let resolver_address = registry
            .resolver(node_bytes)
            .call()
            .await
            .map_err(|e| TnsError::ContractError(e.to_string()))?;

        if resolver_address == Address::ZERO {
            return Ok(None);
        }

        let resolver = TNSResolver::TNSResolverInstance::new(resolver_address, registry.provider());

        let avatar = resolver
            .text(node_bytes, "avatar".to_string())
            .call()
            .await
            .ok()
            .filter(|s| !s.is_empty());

        Ok(avatar)
    }

    pub async fn get_text_record(
        name: &str,
        key: &str,
        registry: &TNSRegistry::TNSRegistryInstance<DynProvider, Ethereum>,
    ) -> Result<Option<String>, TnsError> {
        let full_name = if name.ends_with(".trust") {
            name.to_string()
        } else {
            format!("{}.trust", name)
        };

        let node = Self::namehash(&full_name);
        let node_bytes = FixedBytes::from_slice(node.as_slice());

        let resolver_address = registry
            .resolver(node_bytes)
            .call()
            .await
            .map_err(|e| TnsError::ContractError(e.to_string()))?;

        if resolver_address == Address::ZERO {
            return Ok(None);
        }

        let resolver = TNSResolver::TNSResolverInstance::new(resolver_address, registry.provider());

        let value = resolver
            .text(node_bytes, key.to_string())
            .call()
            .await
            .ok()
            .filter(|s| !s.is_empty());

        Ok(value)
    }

    fn prepare_reverse_name(address: Address) -> String {
        let addr_str = address.to_string().to_lowercase();
        format!("{}.addr.reverse", addr_str.trim_start_matches("0x"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_namehash_empty() {
        assert_eq!(Tns::namehash(""), vec![0u8; 32]);
    }

    #[test]
    fn test_namehash_trust() {
        let hash = Tns::namehash("trust");
        assert_eq!(hash.len(), 32);
        assert_ne!(hash, vec![0u8; 32]);
    }

    #[test]
    fn test_namehash_alice_trust() {
        let hash = Tns::namehash("alice.trust");
        assert_eq!(hash.len(), 32);
        assert_ne!(hash, vec![0u8; 32]);
        assert_ne!(hash, Tns::namehash("trust"));
    }

    #[test]
    fn test_namehash_consistency() {
        let hash1 = Tns::namehash("alice.trust");
        let hash2 = Tns::namehash("alice.trust");
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_namehash_different_names() {
        let hash_alice = Tns::namehash("alice.trust");
        let hash_bob = Tns::namehash("bob.trust");
        assert_ne!(hash_alice, hash_bob);
    }

    #[test]
    fn test_prepare_reverse_name() {
        let address: Address = "0xf1016a7fe89eb9d244c3bfb270071b24619e36c6"
            .parse()
            .unwrap();
        let reverse = Tns::prepare_reverse_name(address);
        assert_eq!(
            reverse,
            "f1016a7fe89eb9d244c3bfb270071b24619e36c6.addr.reverse"
        );
    }
}
