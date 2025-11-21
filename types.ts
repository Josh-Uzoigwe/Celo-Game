export type Web3Status = 'disconnected' | 'connecting' | 'connected';

export type RoundStatus = 'lobby' | 'live' | 'settled';

export interface RoundInfo {
  id: number;
  title: string;
  description: string;
  status: RoundStatus;
  startTime: number;
  endTime: number;
  entryFeeCelo: number;
  prizePoolCelo: number;
  players: number;
  minPlayers: number;
  jackpotBoost: number;
  highlight?: string;
  topScore?: number;
}

export interface LeaderboardEntry {
  rank: number;
  player: string;
  score: number;
  streak: number;
  xp: number;
}

export interface WalletStats {
  xp: number;
  streak: number;
  badges: string[];
  currentTier: 'Beginner' | 'Pilot' | 'Prophet' | 'Oracle';
}

export interface Boost {
  id: string;
  title: string;
  description: string;
  costXp: number;
  unlocked: boolean;
}

export interface RewardTier {
  placement: string;
  bps: number;
  note?: string;
}

export interface GameplayHint {
  label: string;
  value: string;
  detail: string;
  icon: string;
}

export const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export const getTierFromXp = (xp: number): WalletStats['currentTier'] => {
  if (xp >= 2000) return 'Oracle';
  if (xp >= 800) return 'Prophet';
  if (xp >= 250) return 'Pilot';
  return 'Beginner';
};