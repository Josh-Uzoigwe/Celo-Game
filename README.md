# SkySprint ⚡

SkySprint is a mobile-first play-to-earn mini-game built for the Celo hackathon. Players stake tiny CELO entry fees, sprint through 60-second tap challenges, and the smart contract auto-distributes prizes to the top pilots. A jackpot vault, XP-based boosts, and an anti-cheat relayer keep the loop sticky.

![SkySprint preview](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## Features

- **Deterministic skill rounds** – rounds have on-chain seeded layouts so everyone plays the same course.
- **Prize pool escrow** – entry fees stream into `Play2EarnGame.sol`, splitting between prize pool, jackpot vault, and treasury rake.
- **Wallet-first UX** – Composer Kit-inspired React UI with Valora/MetaMask connect, leaderboard, boosts, and practice mode.
- **Score relayer** – backend service (optional) validates signed payloads before calling `submitScore`.
- **Reward tiers** – default 40/25/15/10/10 distribution with surplus rollover support.

## Tech Stack

| Layer        | Tools                                                                      |
|--------------|----------------------------------------------------------------------------|
| Smart Contract | Solidity, OpenZeppelin (`contracts/Play2EarnGame.sol`)                     |
| Frontend     | React + Vite (Composer Kit styling, mobile-first)                          |
| Wallets      | Any WalletConnect-compatible Celo wallet (Valora, MetaMask)                |
| Backend      | Optional Node relay for anti-cheat + score signatures                      |

## Getting Started

```bash
npm install
npm run dev
```

Set the following environment variables before connecting to Celo:

| Variable | Description |
|----------|-------------|
| `VITE_CELO_RPC_URL` | Full node endpoint (e.g., https://alfajores-forno.celo-testnet.org) |
| `VITE_PLAY2EARN_CONTRACT` | Address of deployed `Play2EarnGame` |

*(If these are absent, the UI falls back to mock data for rapid prototyping.)*

## Smart Contract (`contracts/Play2EarnGame.sol`)

- Manages rounds, entry fees, jackpot vault, and reward tiers.
- Relayer submits scores signed by the player `{contract, roundId, player, score, nonce}`.
- `finalizeRound` validates recorded scores and pushes CELO into per-player claim balances.
- Admin knobs: reward tiers, rake %, jackpot %, score grace window, relayer address.

See `docs/play2earn-contract.md` for the full breakdown.

## Frontend UX Highlights

- Responsive layout optimized for mobile viewports (<500px) with desktop enhancements.
- Live leaderboard, wallet stats card, boost lab, and gameplay telemetry.
- Practice mode animates client-side score previews while showing how the backend submits real scores.

## Backend Relay (Optional)

The UI expects a lightweight service that:

1. Issues a nonce via `getScoreNonce` (or off-chain cache).
2. Replays the deterministic seed to evaluate tap timing and heuristics.
3. Calls `submitScore(roundId, player, score, nonce, signature)` from the trusted relayer key.

An outline lives in `docs/backend-score-service.md`.

## Deployment Checklist

1. Deploy `Play2EarnGame.sol` to Alfajores using `celocli` or Foundry.
2. Update `VITE_PLAY2EARN_CONTRACT` + RPC URL.
3. Point the relay service at the deployed address and set its signer via `setScoreRelayer`.
4. `npm run build` then host the `/dist` folder on Static Web Apps, Vercel, or Cloudflare Pages.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build locally |

## Contributing

1. Fork the repo
2. Create a feature branch
3. Commit with context (`feat: add boost lab`)
4. Open a PR with screenshots or screen recording

## License

MIT – hackathon friendly, feel free to remix with attribution. 🎮
