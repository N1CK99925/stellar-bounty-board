#![cfg(test)]

use super::*;
use reputation_contract::{ReputationContract, ReputationContractClient};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::Env;

struct TestSetup {
    env: Env,
    bounty: BountyContractClient<'static>,
    reputation: ReputationContractClient<'static>,
    admin: Address,
    creator: Address,
    claimer: Address,
}

fn setup() -> TestSetup {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let claimer = Address::generate(&env);

    let reputation_id = env.register_contract(None, ReputationContract);
    let reputation = ReputationContractClient::new(&env, &reputation_id);
    reputation.initialize(&admin);

    let bounty_id = env.register_contract(None, BountyContract);
    let bounty = BountyContractClient::new(&env, &bounty_id);
    bounty.initialize(&admin, &reputation_id);

    // Wire up inter-contract permission: only the bounty contract may
    // call increase_reputation on the reputation contract.
    reputation.set_authorized_caller(&admin, &bounty_id);

    TestSetup {
        env,
        bounty,
        reputation,
        admin: admin.clone(),
        creator,
        claimer,
    }
}

fn desc(env: &Env, text: &str) -> String {
    String::from_str(env, text)
}

#[test]
fn test_full_bounty_lifecycle_rewards_reputation() {
    let s = setup();

    s.bounty
        .create_bounty(&s.creator, &1, &1000, &desc(&s.env, "Fix the landing page bug"));

    let bounty = s.bounty.get_bounty(&1).unwrap();
    assert_eq!(bounty.status, BountyStatus::Open);
    assert_eq!(bounty.amount, 1000);

    s.bounty.claim_bounty(&s.claimer, &1);
    let bounty = s.bounty.get_bounty(&1).unwrap();
    assert_eq!(bounty.status, BountyStatus::Claimed);
    assert_eq!(s.bounty.get_claimer(&1), Some(s.claimer.clone()));

    let new_score = s.bounty.complete_bounty(&s.creator, &1);
    assert_eq!(new_score, 10);

    let bounty = s.bounty.get_bounty(&1).unwrap();
    assert_eq!(bounty.status, BountyStatus::Completed);

    // Confirm the inter-contract call actually persisted state on the
    // reputation contract, not just returned a value.
    assert_eq!(s.reputation.get_reputation(&s.claimer), 10);
}

#[test]
fn test_cannot_claim_already_claimed_bounty() {
    let s = setup();
    let other_claimer = Address::generate(&s.env);

    s.bounty
        .create_bounty(&s.creator, &2, &500, &desc(&s.env, "Write docs"));
    s.bounty.claim_bounty(&s.claimer, &2);

    let result = s.bounty.try_claim_bounty(&other_claimer, &2);
    assert!(result.is_err());
}

#[test]
fn test_only_creator_can_complete_bounty() {
    let s = setup();
    let stranger = Address::generate(&s.env);

    s.bounty
        .create_bounty(&s.creator, &3, &750, &desc(&s.env, "Audit contract"));
    s.bounty.claim_bounty(&s.claimer, &3);

    let result = s.bounty.try_complete_bounty(&stranger, &3);
    assert!(result.is_err());
}

#[test]
fn test_creator_can_cancel_open_bounty() {
    let s = setup();

    s.bounty
        .create_bounty(&s.creator, &4, &200, &desc(&s.env, "Design a logo"));
    s.bounty.cancel_bounty(&s.creator, &4);

    let bounty = s.bounty.get_bounty(&4).unwrap();
    assert_eq!(bounty.status, BountyStatus::Cancelled);
}

#[test]
fn test_cannot_create_bounty_with_zero_amount() {
    let s = setup();
    let result = s
        .bounty
        .try_create_bounty(&s.creator, &5, &0, &desc(&s.env, "Free work?"));
    assert!(result.is_err());
}

#[test]
fn test_admin_stored_matches_setup() {
    let s = setup();
    assert_eq!(s.admin, s.admin);
}
