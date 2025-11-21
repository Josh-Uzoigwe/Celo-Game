# SkySprint: Play-to-Earn Mini-Game (Celo)

## Core Pitch
SkySprint is a 60-second skill challenge where players race to collect energy orbs while avoiding decoys. Players stake a small CELO entry fee, compete on a global leaderboard, and the top performers earn the round’s prize pool. The experience is tuned for mobile and designed to feel like a tight arcade loop that’s easy to learn and replayable.

## Game Loop
1. **Join round** – Player connects a Celo wallet (Valora, MetaMask) and pays the entry fee into the on-chain prize pool.
2. **Boost & prep** – Optional off-chain boosts (skins, practice mode) unlock by holding in-game reputation points.
3. **Play sprint** – 60-second tap/drag mini-game built in React Native (Composer Kit) with deterministic randomness seeded via the smart contract.
4. **Submit score** – Client signs the score payload; backend relay validates anti-cheat heuristics and forwards to the contract.
5. **Leaderboard + payout** – Contract holds funds until the round ends, then auto-distributes CELO to top tiers; losers get consolation XP points for future boosts.
6. **Replay** – Players can immediately jump into the next sprint, compounding retention.

## Reward Structure
| Placement | Payout (% of pool) | Notes |
|-----------|-------------------|-------|
| 1st       | 40%               | Minimum guaranteed payout |
| 2nd       | 25%               | Bonus multiplier if streak ≥3 |
| 3rd       | 15%               | Receives collectible badge NFT (optional future work) |
| 4th-10th  | 20% split         | Flat per-player split, keeps leaderboard sticky |
| All others| 0% CELO           | Earn 1 XP per 100 pts for cosmetic boosts |

Additional details:
- **Entry fee**: configurable (default 0.5 CELO) so early rounds remain accessible.
- **House rake**: optional ≤5% for sustainability, routed to treasury multi-sig.
- **Jackpot booster**: 10% of every round rolls into a weekly mega-pool to keep engagement high.

Prize pool is round-based with a configurable rollover: if a round doesn’t hit the minimum players, the funds roll to the next round to create “jackpot spikes.”

## Player Journey & UX Beats
1. **Discovery** – Landing page highlights current jackpot, last winners, and CTA to connect Valora or MetaMask.
2. **Warm-up lobby** – After wallet connection, players see countdown to next round, current prize split, and can practice offline for free (scores don’t count).
3. **Stake & Lock-In** – Paying entry fee mints an on-chain “ticket” NFT ID used to tie the player to the round and enables tracking boosts.
4. **Gameplay moment** – Tap/drag loop with real-time power-up prompts; progress bar + haptics reinforce urgency.
5. **Post-round recap** – Animated leaderboard reveal, XP earned, and shareable card for social.
6. **Replay hooks** – Auto-queue toggle plus push notification opt-in if player wants reminders.

## Session Flow Timeline
| Phase | Duration | Key UX Goals |
|-------|----------|--------------|
| Lobby countdown | 15s | Show prize, encourage staking |
| Gameplay | 60s | High-intensity taps/combos |
| Results buffer | 10s | Anti-cheat validation, hype |
| Payout reveal | 5s | Visual fireworks + CELO transfer prompt |

## Score Validation Steps
1. Client requests nonce from contract `getScoreNonce(roundId)`.
2. Gameplay client packages `{score, taps, uptimeHash, nonce}` and signs with wallet private key.
3. Backend service (`api/scoreRelay`) replays deterministic seed, checks anomalies, then submits `submitScore(roundId, payload, signature)` to contract.
4. Contract verifies signature + nonce, stores score, emits `ScoreSubmitted`.

This flow caps submissions to 1 per nonce, deters bots, and gives us an audit trail for dispute resolution.

## Anti-Cheat & Fairness
- Deterministic random seeds hashed on-chain and revealed post-round.
- Score submissions include device fingerprint, frame-timing histogram, and zkp-ready hash for future upgrades.
- Backend service throttles suspicious submissions and requires signed nonce from the contract to prevent replay attacks.

## Expansion Hooks
- Weekly tournaments combining multiple rounds.
- Prediction-market style side pots (bet on winning streaks).
- Educational / trivia swaps by reusing the entry-fee + leaderboard payout mechanics.

