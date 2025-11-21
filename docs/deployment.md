# Deployment Runbook

## 1. Smart Contract
1. Install Foundry or Hardhat.
2. Set environment variables:
   ```bash
   export CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
   export CELO_PRIVATE_KEY=0x...
   ```
3. Deploy `contracts/Play2EarnGame.sol` with your relayer + owner addresses:
   ```bash
   forge create contracts/Play2EarnGame.sol:Play2EarnGame \
     --rpc-url $CELO_RPC_URL \
     --private-key $CELO_PRIVATE_KEY \
     --constructor-args 0xRELAYER 0xOWNER
   ```
4. Record the deployed address and update `VITE_PLAY2EARN_CONTRACT` + `PLAY2EARN_GAME_ADDRESS`.

## 2. Configure Relayer
1. Provision a service based on `server/score-relay.ts`.
2. Set `CELO_RPC_URL`, `SCORE_RELAYER_PK`, and point it at the deployed contract.
3. Call `setScoreRelayer(relayAddress)` on the contract from the owner account.

## 3. Frontend
1. Provide `.env`:
   ```
   VITE_CELO_RPC_URL=https://alfajores-forno.celo-testnet.org
   VITE_PLAY2EARN_CONTRACT=0xYourContract
   ```
2. Build and deploy:
   ```bash
   npm run build
   npx wrangler pages deploy dist   # or `vercel deploy --prod`
   ```

## 4. Post-Deploy Checklist
- [ ] Fund jackpot via `seedJackpot`.
- [ ] Create at least one round and fund it.
- [ ] Smoke test: connect wallet, enter round, submit mock score, finalize, claim.
- [ ] Update `README.md` with the live URLs (dApp + explorer link).

