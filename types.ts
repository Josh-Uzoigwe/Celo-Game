export enum MarketCategory {
  SPORTS = 'Sports',
  CRYPTO = 'Crypto',
  POLITICS = 'Politics',
  ENTERTAINMENT = 'Entertainment',
  OTHER = 'Other'
}

export interface Market {
  id: number;
  creator: string;
  title: string;
  description: string;
  category: MarketCategory;
  outcomes: string[];
  outcomePools: string[]; // Represented as string for BigInt safety
  totalPool: string;
  lockTime: number; // Timestamp in seconds
  resolveTime: number; // Timestamp in seconds
  resolved: boolean;
  winningOutcome: number | null; // Index of winning outcome
  imageUrl?: string;
}

export interface BetInfo {
  marketId: number;
  outcomeIndex: number;
  amount: string;
  user: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isMe: boolean;
}

export type Web3Status = 'disconnected' | 'connecting' | 'connected';

export const getLevelInfo = (betCount: number) => {
  if (betCount >= 20) return { title: 'Oracle', icon: '🔮', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-200 dark:border-purple-800' };
  if (betCount >= 5) return { title: 'Prophet', icon: '👁️', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-200 dark:border-blue-800' };
  return { title: 'Beginner', icon: '🌱', color: 'text-celo-green', bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-200 dark:border-green-800' };
};