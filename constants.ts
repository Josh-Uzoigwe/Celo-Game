import { RewardTier } from './types';

// Replace with deployed contract on Alfajores/Mainnet
export const PLAY2EARN_GAME_ADDRESS = '';
export const CELO_ALFAJORES_CHAIN_ID = 44787;

export const PLAY2EARN_GAME_ABI = [
  'function createRound(uint64 startTime,uint64 endTime,uint256 entryFee,uint256 minPlayers,bool rolloverEnabled) external returns (uint256)',
  'function fundRound(uint256 roundId) external payable',
  'function enterRound(uint256 roundId) external payable',
  'function submitScore(uint256 roundId,address player,uint256 score,bytes32 nonce,bytes signature) external',
  'function finalizeRound(uint256 roundId,address[] placements,uint96[] customTierBps,bool rollOverSurplus) external',
  'function claimRewards() external',
  'function rounds(uint256 roundId) external view returns (uint64,uint64,uint256,uint256,uint256,uint256,bool,bool)',
  'function rewardTierBps(uint256 index) external view returns (uint96)',
  'function rewardTierCount() external view returns (uint256)',
  'event RoundCreated(uint256 indexed roundId,uint64 startTime,uint64 endTime)',
  'event PlayerEntered(uint256 indexed roundId,address indexed player)',
  'event ScoreSubmitted(uint256 indexed roundId,address indexed player,uint256 score,bytes32 nonce)',
  'event RoundFinalized(uint256 indexed roundId,uint256 totalPaid,address indexed caller,bool jackpotRolled)'
];

export const DEFAULT_REWARD_TIERS: RewardTier[] = [
  { placement: '1st', bps: 4000, note: 'Guaranteed minimum, fireworks animation' },
  { placement: '2nd', bps: 2500, note: 'Streak multiplier unlocks +5%' },
  { placement: '3rd', bps: 1500, note: 'Receives badge + XP booster' },
  { placement: '4th-5th', bps: 1000, note: 'Flat split keeps leaderboard sticky' },
  { placement: '6th-10th', bps: 1000, note: 'Participation rewards & XP' }
];

export const MOCK_MEDIA = [
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=80',
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1000&q=80'
];