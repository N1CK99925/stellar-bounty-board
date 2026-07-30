#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::Env;

fn setup() -> (Env, ReputationContractClient<'static>, Address) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ReputationContract);
    let client = ReputationContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    client.initialize(&admin);

    (env, client, admin)
}

#[test]
fn test_initialize_sets_admin_once() {
    let (_env, client, admin) = setup();
    // Calling initialize again should fail.
    let result = client.try_initialize(&admin);
    assert!(result.is_err());
}

#[test]
fn test_authorized_caller_can_increase_reputation() {
    let (env, client, admin) = setup();
    let caller = Address::generate(&env);
    let user = Address::generate(&env);

    client.set_authorized_caller(&admin, &caller);

    let new_score = client.increase_reputation(&user, &10);
    assert_eq!(new_score, 10);

    let second_score = client.increase_reputation(&user, &5);
    assert_eq!(second_score, 15);

    assert_eq!(client.get_reputation(&user), 15);
}

#[test]
fn test_unregistered_caller_cannot_bypass_authorization_state() {
    let (env, client, _admin) = setup();
    let user = Address::generate(&env);

    // No authorized caller has been registered yet, so this must fail.
    let result = client.try_increase_reputation(&user, &10);
    assert!(result.is_err());
}

#[test]
fn test_reputation_defaults_to_zero() {
    let (env, client, _admin) = setup();
    let user = Address::generate(&env);
    assert_eq!(client.get_reputation(&user), 0);
}
