use crate::{DataKey, Error};
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Symbol};

const REP_UP: Symbol = symbol_short!("rep_up");

#[contract]
pub struct ReputationContract;

#[contractimpl]
impl ReputationContract {
    /// Initialize the contract with an admin address.
    /// The admin is the only account allowed to designate which
    /// contract (e.g. the bounty contract) may call `increase_reputation`.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        Ok(())
    }

    /// Admin-only: register the contract address that is allowed to call
    /// `increase_reputation`. In this project that is the bounty contract,
    /// demonstrating inter-contract communication and access control.
    pub fn set_authorized_caller(env: Env, admin: Address, caller: Address) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;

        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }
        admin.require_auth();

        env.storage()
            .instance()
            .set(&DataKey::AuthorizedCaller, &caller);
        Ok(())
    }

    /// Increases a user's reputation score. Can only be invoked by the
    /// contract registered via `set_authorized_caller` (the bounty
    /// contract), which authorizes itself automatically when it makes
    /// this cross-contract call.
    pub fn increase_reputation(env: Env, user: Address, points: u32) -> Result<u32, Error> {
        let authorized: Address = env
            .storage()
            .instance()
            .get(&DataKey::AuthorizedCaller)
            .ok_or(Error::NotInitialized)?;

        authorized.require_auth();

        let key = DataKey::Reputation(user.clone());
        let current: u32 = env.storage().persistent().get(&key).unwrap_or(0);
        let updated = current.saturating_add(points);
        env.storage().persistent().set(&key, &updated);

        env.events().publish((REP_UP, user), updated);

        Ok(updated)
    }

    /// Read-only lookup of a user's current reputation score.
    pub fn get_reputation(env: Env, user: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::Reputation(user))
            .unwrap_or(0)
    }
}
