// REPLACE THIS WITH YOUR DEPLOYED CONTRACT ADDRESS ON CELO ALFAJORES
export const PREDICTION_MARKET_ADDRESS = ""; 

export const CELO_ALFAJORES_CHAIN_ID = 44787;

export const MARKET_ABI = [
  "function createMarket(string title, string description, string category, string imageUrl, string[] outcomes, uint256 lockTime, uint256 resolveTime) external returns (uint256)",
  "function bet(uint256 marketId, uint8 outcomeId) external payable",
  "function resolveMarket(uint256 marketId, uint8 outcomeId) external",
  "function claim(uint256 marketId) external",
  "function getMarket(uint256 marketId) external view returns (tuple(address creator, string title, string description, string category, string imageUrl, string[] outcomes, uint256[] outcomePools, uint256 totalPool, uint256 lockTime, uint256 resolveTime, bool resolved, uint256 winningOutcome))",
  "function getMarketCount() external view returns (uint256)",
  "event MarketCreated(uint256 indexed marketId, string title, string category, string imageUrl)",
  "event BetPlaced(uint256 indexed marketId, address indexed user, uint8 outcomeId, uint256 amount)",
  "event MarketResolved(uint256 indexed marketId, uint8 winningOutcome)",
  "event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount)"
];

export const MOCK_IMAGES: Record<string, string> = {
  Sports: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80",
  Crypto: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?auto=format&fit=crop&w=800&q=80",
  Politics: "https://images.unsplash.com/photo-1541872703-74c5963631df?auto=format&fit=crop&w=800&q=80",
  Entertainment: "https://images.unsplash.com/photo-1603190287605-e6ade322388d?auto=format&fit=crop&w=800&q=80",
  Other: "https://images.unsplash.com/photo-1550565118-c974fb6c64c0?auto=format&fit=crop&w=800&q=80",
};