import { createHash, randomBytes } from 'crypto';
import { ethers } from 'ethers';
import { PLAY2EARN_GAME_ABI, PLAY2EARN_GAME_ADDRESS } from '../constants';

type NonceRecord = {
  nonce: string;
  expiresAt: number;
};

export interface TelemetryPayload {
  taps: number;
  avgFrameMs: number;
  uptimeHash: string;
  device: string;
}

export interface SubmitScorePayload {
  roundId: number;
  player: string;
  score: number;
  nonce: string;
  signature: string;
  telemetry: TelemetryPayload;
}

export class ScoreRelayService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private nonceCache: Map<string, NonceRecord> = new Map();
  private readonly nonceTtlSeconds = 60;

  constructor(rpcUrl: string, privateKey: string) {
    if (!PLAY2EARN_GAME_ADDRESS) {
      throw new Error('Set PLAY2EARN_GAME_ADDRESS before using ScoreRelayService.');
    }
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
  }

  private cacheKey(roundId: number, player: string) {
    return `${roundId}:${player.toLowerCase()}`;
  }

  issueNonce(roundId: number, player: string) {
    const nonce = `0x${randomBytes(32).toString('hex')}`;
    const expiresAt = Math.floor(Date.now() / 1000) + this.nonceTtlSeconds;
    this.nonceCache.set(this.cacheKey(roundId, player), { nonce, expiresAt });
    return { nonce, expiresAt };
  }

  validateTelemetry(payload: TelemetryPayload) {
    if (payload.taps < 10 || payload.taps > 400) {
      throw new Error('invalid tap count');
    }
    if (payload.avgFrameMs > 60) {
      throw new Error('device too laggy');
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(payload.uptimeHash)) {
      throw new Error('invalid uptime hash');
    }
  }

  private ensureNonce(roundId: number, player: string, nonce: string) {
    const record = this.nonceCache.get(this.cacheKey(roundId, player));
    if (!record || record.nonce !== nonce) {
      throw new Error('nonce mismatch');
    }
    if (record.expiresAt < Math.floor(Date.now() / 1000)) {
      this.nonceCache.delete(this.cacheKey(roundId, player));
      throw new Error('nonce expired');
    }
    this.nonceCache.delete(this.cacheKey(roundId, player));
  }

  async submitScore(payload: SubmitScorePayload) {
    this.validateTelemetry(payload.telemetry);
    this.ensureNonce(payload.roundId, payload.player, payload.nonce);

    const digest = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'address', 'uint256', 'bytes32'],
      [PLAY2EARN_GAME_ADDRESS, payload.roundId, payload.player, payload.score, payload.nonce]
    );
    const recovered = ethers.verifyMessage(ethers.getBytes(digest), payload.signature);
    if (recovered.toLowerCase() !== payload.player.toLowerCase()) {
      throw new Error('signature mismatch');
    }

    const contract = new ethers.Contract(
      PLAY2EARN_GAME_ADDRESS,
      PLAY2EARN_GAME_ABI,
      this.signer
    );

    const tx = await contract.submitScore(
      payload.roundId,
      payload.player,
      payload.score,
      payload.nonce,
      payload.signature,
      { gasLimit: 1_000_000 }
    );
    await tx.wait();

    return {
      txHash: tx.hash,
      digest,
    };
  }

  createTelemetryDigest(payload: TelemetryPayload) {
    const serialized = JSON.stringify(payload);
    return `0x${createHash('sha256').update(serialized).digest('hex')}`;
  }
}

export const createScoreRelayService = () => {
  const rpcUrl = process.env.CELO_RPC_URL || 'https://alfajores-forno.celo-testnet.org';
  const pk = process.env.SCORE_RELAYER_PK;
  if (!pk) throw new Error('Missing SCORE_RELAYER_PK env var');
  return new ScoreRelayService(rpcUrl, pk);
};

