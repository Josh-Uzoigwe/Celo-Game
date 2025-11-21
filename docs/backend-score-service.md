# Score Relay Service (Optional)

This lightweight service validates gameplay telemetry and relays signed scores to the `Play2EarnGame` contract. It keeps the on-chain surface area small while still enabling anti-cheat heuristics.

## Responsibilities
1. **Nonce issuance** – expose `/nonce?roundId=x&player=0x...` that returns a short-lived nonce pulled from Redis/Postgres.
2. **Telemetry validation** – replay deterministic seed, ensure tap cadence looks human (frame histogram, missed inputs, etc).
3. **Contract submission** – call `submitScore` with the player’s signature once the payload passes heuristics.
4. **Alerting** – emit structured logs for suspicious runs and optionally quarantine the wallet.

## Sample Flow
1. Client requests nonce → backend stores `{roundId, player, nonce, expiresAt}`.
2. After the run, client signs `hash(contract, roundId, player, score, nonce)` and POSTs telemetry.
3. Backend validates metrics, then uses its relayer private key to call `submitScore`.
4. Contract emits `ScoreSubmitted`, front-end updates via polling or websocket.

## API Sketch
```http
GET /api/nonce?roundId=101&player=0x123...
→ { nonce: "0xabc", expiresAt: 1732579200 }

POST /api/submit-score
Body: {
  "roundId": 101,
  "player": "0x123...",
  "score": 38750,
  "nonce": "0xabc",
  "signature": "0x...",
  "telemetry": {
    "taps": 142,
    "avgFrameMs": 15.9,
    "uptimeHash": "0xseedhash",
    "device": "ios-18"
  }
}
```

## Tech Stack Recommendation
- Node.js + Fastify for the API.
- `ethers` or `viem` for contract calls.
- Redis for nonce cache + rate limiting.
- Cloud Functions / Fly.io / Railway for low-latency deployments.

## Security Notes
- Store the relayer private key in a secure vault (GCP Secret Manager, AWS KMS, etc).
- Rate-limit by wallet + device fingerprint.
- Log hashes only (no raw PII) to stay privacy-friendly.
- Consider slashing/blacklisting rules tied to the treasury multi-sig.

