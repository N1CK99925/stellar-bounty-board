#![no_std]

use soroban_sdk::{contracterror, contracttype, Address};

#[cfg(not(feature = "contract"))]
use soroban_sdk::{contractclient, Env};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    AuthorizedCaller,
    Reputation(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
}

// ---------------------------------------------------------------------------
// Client interface — always compiled regardless of feature flags.
//
// When reputation-contract is used as a library dep by bounty-contract
// (with default-features = false, so the `contract` feature is OFF), only
// this #[contractclient] trait is compiled. It generates `ReputationContractClient`
// without any #[no_mangle] WASM exports, preventing "symbol multiply defined"
// linker errors.
//
// When the `contract` feature IS active (building this package standalone or
// in tests), the full #[contractimpl] generates its own ReputationContractClient,
// so we skip this trait to avoid a duplicate type definition.
// ---------------------------------------------------------------------------
#[cfg(not(feature = "contract"))]
#[contractclient(name = "ReputationContractClient")]
pub trait ReputationContractInterface {
    fn initialize(env: Env, admin: Address) -> Result<(), Error>;
    fn set_authorized_caller(env: Env, admin: Address, caller: Address) -> Result<(), Error>;
    fn increase_reputation(env: Env, user: Address, points: u32) -> Result<u32, Error>;
    fn get_reputation(env: Env, user: Address) -> u32;
}

// ---------------------------------------------------------------------------
// Full contract implementation — compiled only when `contract` feature is on.
// Gating it prevents its #[no_mangle] WASM entry points from being linked
// into bounty-contract's WASM, which would duplicate symbols.
// ---------------------------------------------------------------------------
#[cfg(feature = "contract")]
pub mod contract;

#[cfg(feature = "contract")]
pub use contract::{ReputationContract, ReputationContractClient};

mod test;
