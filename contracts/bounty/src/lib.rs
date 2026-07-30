#![no_std]

use reputation_contract::ReputationContractClient;
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String,
    Symbol,
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    ReputationContract,
    Bounty(u64),
    // Stored separately from `Bounty` because Soroban's contracttype
    // encoding for struct fields does not support `Option<Address>`
    // directly (Address is a host object, not a plain XDR value).
    // Keeping it as its own entry, only written once a bounty is
    // claimed, avoids that limitation cleanly.
    BountyClaimer(u64),
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum BountyStatus {
    Open,
    Claimed,
    Completed,
    Cancelled,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Bounty {
    pub id: u64,
    pub creator: Address,
    pub amount: i128,
    pub description: String,
    pub status: BountyStatus,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    BountyAlreadyExists = 3,
    BountyNotFound = 4,
    NotOpen = 5,
    NotClaimed = 6,
    NotCreator = 7,
    InvalidAmount = 8,
}

const BOUNTY_CREATED: Symbol = symbol_short!("b_create");
const BOUNTY_CLAIMED: Symbol = symbol_short!("b_claim");
const BOUNTY_DONE: Symbol = symbol_short!("b_done");
const BOUNTY_CANCEL: Symbol = symbol_short!("b_cancel");

/// Reputation points awarded to the claimer when a bounty is completed.
const COMPLETION_REWARD: u32 = 10;

#[contract]
pub struct BountyContract;

#[contractimpl]
impl BountyContract {
    /// Sets up the contract, wiring it to the reputation contract instance
    /// it will call into when a bounty is completed (inter-contract call).
    pub fn initialize(env: Env, admin: Address, reputation_contract: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::ReputationContract, &reputation_contract);
        Ok(())
    }

    /// Creates a new open bounty. Only the creator's signature is required.
    pub fn create_bounty(
        env: Env,
        creator: Address,
        id: u64,
        amount: i128,
        description: String,
    ) -> Result<(), Error> {
        creator.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let key = DataKey::Bounty(id);
        if env.storage().persistent().has(&key) {
            return Err(Error::BountyAlreadyExists);
        }

        let bounty = Bounty {
            id,
            creator: creator.clone(),
            amount,
            description,
            status: BountyStatus::Open,
        };

        env.storage().persistent().set(&key, &bounty);
        env.events().publish((BOUNTY_CREATED, id), creator);
        Ok(())
    }

    /// Allows any account to claim an open bounty, committing to complete it.
    pub fn claim_bounty(env: Env, claimer: Address, id: u64) -> Result<(), Error> {
        claimer.require_auth();

        let key = DataKey::Bounty(id);
        let mut bounty: Bounty = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::BountyNotFound)?;

        if bounty.status != BountyStatus::Open {
            return Err(Error::NotOpen);
        }

        bounty.status = BountyStatus::Claimed;
        env.storage().persistent().set(&key, &bounty);
        env.storage()
            .persistent()
            .set(&DataKey::BountyClaimer(id), &claimer);

        env.events().publish((BOUNTY_CLAIMED, id), claimer);
        Ok(())
    }

    /// Called by the bounty creator to mark work as complete. This triggers
    /// an inter-contract call into the reputation contract to reward the
    /// claimer, demonstrating cross-contract communication, and returns the
    /// claimer's updated reputation score.
    pub fn complete_bounty(env: Env, creator: Address, id: u64) -> Result<u32, Error> {
        creator.require_auth();

        let key = DataKey::Bounty(id);
        let mut bounty: Bounty = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::BountyNotFound)?;

        if bounty.creator != creator {
            return Err(Error::NotCreator);
        }
        if bounty.status != BountyStatus::Claimed {
            return Err(Error::NotClaimed);
        }

        let claimer: Address = env
            .storage()
            .persistent()
            .get(&DataKey::BountyClaimer(id))
            .ok_or(Error::NotClaimed)?;

        bounty.status = BountyStatus::Completed;
        env.storage().persistent().set(&key, &bounty);

        let reputation_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::ReputationContract)
            .ok_or(Error::NotInitialized)?;

        // Inter-contract call: the bounty contract invokes the reputation
        // contract to increase the claimer's score. This call authorizes
        // itself using this contract's own address.
        let rep_client = ReputationContractClient::new(&env, &reputation_addr);
        let new_score = rep_client.increase_reputation(&claimer, &COMPLETION_REWARD);

        env.events().publish((BOUNTY_DONE, id), claimer);
        Ok(new_score)
    }

    /// Allows the creator to cancel a bounty that has not yet been claimed.
    pub fn cancel_bounty(env: Env, creator: Address, id: u64) -> Result<(), Error> {
        creator.require_auth();

        let key = DataKey::Bounty(id);
        let mut bounty: Bounty = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::BountyNotFound)?;

        if bounty.creator != creator {
            return Err(Error::NotCreator);
        }
        if bounty.status != BountyStatus::Open {
            return Err(Error::NotOpen);
        }

        bounty.status = BountyStatus::Cancelled;
        env.storage().persistent().set(&key, &bounty);

        env.events().publish((BOUNTY_CANCEL, id), creator);
        Ok(())
    }

    /// Read-only lookup of a bounty by id.
    pub fn get_bounty(env: Env, id: u64) -> Option<Bounty> {
        env.storage().persistent().get(&DataKey::Bounty(id))
    }

    /// Read-only lookup of the address that claimed a bounty, if any.
    pub fn get_claimer(env: Env, id: u64) -> Option<Address> {
        env.storage().persistent().get(&DataKey::BountyClaimer(id))
    }
}

mod test;
