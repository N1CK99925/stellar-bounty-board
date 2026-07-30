import type { Bounty } from "./types";

/**
 * Sample bounties shown when no contract is configured yet, so the UI is
 * fully explorable (including mobile screenshots) before deployment.
 */
export const MOCK_BOUNTIES: Bounty[] = [
  {
    id: 1,
    creator: "GACREATOR1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    claimer: null,
    amount: 500,
    description: "Fix responsive layout bug on the bounty detail page",
    status: "Open",
  },
  {
    id: 2,
    creator: "GACREATOR2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    claimer: "GACLAIMER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    amount: 1200,
    description: "Write integration tests for the reputation contract",
    status: "Claimed",
  },
  {
    id: 3,
    creator: "GACREATOR1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    claimer: "GACLAIMER2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    amount: 300,
    description: "Design the bounty board landing page",
    status: "Completed",
  },
];
