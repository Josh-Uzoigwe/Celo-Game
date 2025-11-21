import { Boost, LeaderboardEntry, RoundInfo, WalletStats, getTierFromXp } from '../types';
import { DEFAULT_REWARD_TIERS, PLAY2EARN_GAME_ADDRESS } from '../constants';

const mockRounds: RoundInfo[] = [
  {
    id: 101,
    title: 'Solar Surge',
    description: 'Collect as many energy orbs as possible before the clock hits zero.',
    status: 'live',
    startTime: Date.now() / 1000 - 20,
    endTime: Date.now() / 1000 + 45,
    entryFeeCelo: 0.5,
    prizePoolCelo: 125.4,
    players: 182,
    minPlayers: 120,
    jackpotBoost: 12,
    topScore: 42100,
  },
  {
    id: 102,
    title: 'Lunar Rush',
    description: 'Obstacle gauntlet with speed boosts every 5 seconds.',
    status: 'lobby',
    startTime: Date.now() / 1000 + 3600,
    endTime: Date.now() / 1000 + 3660,
    entryFeeCelo: 0.75,
    prizePoolCelo: 98.1,
    players: 42,
    minPlayers: 80,
    jackpotBoost: 15,
  },
  {
    id: 103,
    title: 'Nebula Clash',
    description: 'Special tournament round with badge drops.',
    status: 'settled',
    startTime: Date.now() / 1000 - 7200,
    endTime: Date.now() / 1000 - 7140,
    entryFeeCelo: 1,
    prizePoolCelo: 250.8,
    players: 210,
    minPlayers: 150,
    jackpotBoost: 10,
    topScore: 51200,
  },
];

const mockLeaderboard: Record<number, LeaderboardEntry[]> = {
  101: [
    { rank: 1, player: '0xDd3...91B2', score: 42100, streak: 5, xp: 2400 },
    { rank: 2, player: '0x8cA...34e1', score: 39210, streak: 4, xp: 1800 },
    { rank: 3, player: '0x4b1...77a0', score: 36100, streak: 3, xp: 1400 },
    { rank: 4, player: '0xFe2...0d18', score: 33420, streak: 2, xp: 900 },
    { rank: 5, player: '0x1Ff...9341', score: 33010, streak: 1, xp: 760 },
    { rank: 6, player: '0x3b4...1a54', score: 32800, streak: 1, xp: 620 },
    { rank: 7, player: '0xaAa...aa11', score: 32550, streak: 1, xp: 590 },
    { rank: 8, player: '0xBbB...bb22', score: 32000, streak: 0, xp: 540 },
    { rank: 9, player: '0xCcC...cc33', score: 31050, streak: 0, xp: 500 },
    { rank: 10, player: '0xDdD...dd44', score: 30110, streak: 0, xp: 470 },
  ],
};

const baseBoosts: Boost[] = [
  { id: 'trail', title: 'Solar Trail', description: 'Leaves a neon streak behind your runner.', costXp: 150, unlocked: false },
  { id: 'shield', title: 'Pulse Shield', description: 'Ignore the first decoy orb each run.', costXp: 400, unlocked: false },
  { id: 'scanner', title: 'Orb Scanner', description: 'Highlights +5% more high-value orbs.', costXp: 750, unlocked: false },
];

class Web3Service {
  private isMock: boolean;
  private walletAddress: string | null = null;
  private walletStats: WalletStats | null = null;

  constructor() {
    this.isMock = !PLAY2EARN_GAME_ADDRESS;
  }

  async connectWallet(): Promise<string> {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      this.walletAddress = accounts[0];
      return accounts[0];
    }
    this.walletAddress = `0xMockUser${Math.floor(Math.random() * 9999)}`;
    return this.walletAddress;
  }

  async getRounds(): Promise<RoundInfo[]> {
    if (this.isMock) {
      await new Promise((r) => setTimeout(r, 350));
      return [...mockRounds];
    }
    return [];
  }

  async getLeaderboard(roundId: number): Promise<LeaderboardEntry[]> {
    if (this.isMock) {
      await new Promise((r) => setTimeout(r, 250));
      return mockLeaderboard[roundId] || [];
    }
    return [];
  }

  async getWalletStats(): Promise<WalletStats> {
    if (this.walletStats) return this.walletStats;
    const xpFromStorage =
      typeof window !== 'undefined' ? parseInt(localStorage.getItem('skysprint_xp') || '120', 10) : 120;
    const stats: WalletStats = {
      xp: xpFromStorage,
      streak: 2,
      badges: ['Beta Pilot', 'Glitchless Run'],
      currentTier: getTierFromXp(xpFromStorage),
    };
    this.walletStats = stats;
    return stats;
  }

  async getBoosts(): Promise<Boost[]> {
    const stats = await this.getWalletStats();
    return baseBoosts.map((boost) => ({
      ...boost,
      unlocked: stats.xp >= boost.costXp,
    }));
  }

  async joinRound(roundId: number): Promise<{ prizePool: number; players: number }> {
    if (this.isMock) {
      const round = mockRounds.find((r) => r.id === roundId);
      if (!round) throw new Error('Round not found');
      round.players += 1;
      round.prizePoolCelo += round.entryFeeCelo * 0.85;
      await new Promise((r) => setTimeout(r, 400));
      return { prizePool: round.prizePoolCelo, players: round.players };
    }
    return { prizePool: 0, players: 0 };
  }

  async submitMockScore(roundId: number, deltaScore: number): Promise<LeaderboardEntry[]> {
    if (!this.walletAddress) throw new Error('Connect wallet first');
    const entries = mockLeaderboard[roundId] || [];
    const newScore = 30000 + deltaScore;
    const me: LeaderboardEntry = {
      rank: entries.length + 1,
      player: this.walletAddress,
      score: newScore,
      streak: 1,
      xp: (await this.getWalletStats()).xp + 50,
    };
    const updated = [...entries, me]
      .sort((a, b) => b.score - a.score)
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
      }));
    mockLeaderboard[roundId] = updated.slice(0, 10);
    return mockLeaderboard[roundId];
  }

  async claimRewards(): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 600));
    return true;
  }

  getRewardSchedule() {
    return DEFAULT_REWARD_TIERS;
  }
}

export const web3Service = new Web3Service();
