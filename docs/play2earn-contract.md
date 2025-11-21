# Play2EarnGame Smart Contract

## Purpose
`Play2EarnGame.sol` orchestrates round-based prize pools for SkySprint on Celo. It escrows CELO entry fees, enforces jackpot/treasury splits, records the highest signed score per player, and distributes prizes after verification. Gameplay happens off-chain while the contract acts as the source of truth for economic state.

## Key Components
- **Rounds** – each stores scheduling, entry fee, prize pool balance, player count, and whether rollovers are enabled.
- **Entries** – joining a round marks the wallet as active, increments the pool, and splits the fee into (a) prize pool, (b) treasury rake, and (c) jackpot vault contribution.
- **Score Submissions** – only the trusted relayer can push scores on-chain; it must present the player's signature over `{contract, roundId, player, score, nonce}`. Highest score wins; nonces prevent replay.
- **Reward Tiers** – defaults mimic the design doc (40/25/15/10/10). Admin can adjust tiers via `setRewardTiers` while ensuring the total never exceeds 100% (10,000 bps).
- **Finalization** – after the score grace period the owner finalizes a round, providing placement addresses (max tier length). The contract calculates payouts, updates player balances, and chooses whether surplus CELO rolls into the jackpot or treasury.
- **Claims & Treasury** – winners call `claimRewards()` to withdraw CELO. Treasury funds support ops and can be withdrawn by the owner. Jackpot vault can be topped up or injected into future rounds.

## Trust & Roles
- **Owner** – schedules rounds, adjusts economic parameters, finalizes results, and manages treasury/jackpot flows.
- **Score Relayer** – backend service that verifies anti-cheat heuristics before submitting signed payloads on behalf of players.
- **Players** – must stake the entry fee and sign their scores. They can verify fairness because payouts only occur if their signed score was honoured.

## Extensibility Hooks
- `rolloverEnabled` per round to opt into auto jackpot behavior if participation is low.
- `customTierBps` override in `finalizeRound` so special tournaments can use different reward mixes.
- `scoreGracePeriod` toggle to accommodate longer validation windows or tournaments.
- Non-zero `houseRakeBps` creates a sustainable treasury; set to zero for community events.

