import { Market, MarketCategory } from '../types';
import { PREDICTION_MARKET_ADDRESS, MARKET_ABI } from '../constants';

// --- MOCK DATA STORE ---
let mockMarkets: Market[] = [
  {
    id: 0,
    creator: '0x123...mock',
    title: 'Bitcoin Price > $100k by Dec 31st?',
    description: 'Will Bitcoin close above $100,000 USD on any major exchange on December 31st, 2025?',
    category: MarketCategory.CRYPTO,
    imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=800&auto=format&fit=crop', // High quality Bitcoin 3D render
    outcomes: ['Yes', 'No'],
    outcomePools: ['50000000000000000000', '15000000000000000000'], // ~50 CELO, ~15 CELO (Wei)
    totalPool: '65000000000000000000',
    lockTime: Date.now() / 1000 + 86400 * 2, // 2 days from now
    resolveTime: Date.now() / 1000 + 86400 * 3,
    resolved: false,
    winningOutcome: null
  },
  {
    id: 1,
    creator: '0xabc...mock',
    title: 'Real Madrid vs. Barcelona',
    description: 'Who will win the El Clásico match this weekend?',
    category: MarketCategory.SPORTS,
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop', // Soccer stadium at night
    outcomes: ['Real Madrid', 'Barcelona', 'Draw'],
    outcomePools: ['20000000000000000000', '22000000000000000000', '5000000000000000000'], // ~20, ~22, ~5
    totalPool: '47000000000000000000',
    lockTime: Date.now() / 1000 + 3600, // 1 hour from now
    resolveTime: Date.now() / 1000 + 7200,
    resolved: false,
    winningOutcome: null
  },
  {
    id: 2,
    creator: '0xMe',
    title: 'Best Picture Oscar 2025',
    description: 'Which movie will win Best Picture at the upcoming Academy Awards?',
    category: MarketCategory.ENTERTAINMENT,
    imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=800&auto=format&fit=crop', // Movie camera / cinema set
    outcomes: ['Oppenheimer 2', 'Barbie 2', 'Other'],
    outcomePools: ['10000000000000000000', '5000000000000000000', '2000000000000000000'],
    totalPool: '17000000000000000000',
    lockTime: Date.now() / 1000 - 1000, // Locked
    resolveTime: Date.now() / 1000 - 500, // Resolved time passed
    resolved: true,
    winningOutcome: 0
  }
];

// --- SERVICE ---

class Web3Service {
  private isMock: boolean;
  private walletAddress: string | null = null;

  constructor() {
    // If no address is configured, use mock mode for UI demonstration
    this.isMock = !PREDICTION_MARKET_ADDRESS;
  }

  async connectWallet(): Promise<string> {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        this.walletAddress = accounts[0];
        return accounts[0];
      } catch (e) {
        console.error("User denied connection", e);
        throw e;
      }
    } else {
      // Mock login
      this.walletAddress = "0xMockUser" + Math.floor(Math.random() * 1000);
      return this.walletAddress;
    }
  }

  async getMarkets(): Promise<Market[]> {
    if (this.isMock) {
      await new Promise(r => setTimeout(r, 800)); // Simulate network latency
      return [...mockMarkets];
    }
    // Implement actual contract read here using ethers/viem
    return [];
  }

  async createMarket(market: Partial<Market>): Promise<boolean> {
    if (this.isMock) {
      await new Promise(r => setTimeout(r, 1500));
      const newId = mockMarkets.length;
      mockMarkets.unshift({
        ...market,
        id: newId,
        creator: this.walletAddress || '0xAnon',
        outcomePools: market.outcomes!.map(() => '0'),
        totalPool: '0',
        resolved: false,
        winningOutcome: null,
        category: market.category || MarketCategory.OTHER
      } as Market);
      return true;
    }
    return false;
  }

  async placeBet(marketId: number, outcomeIndex: number, amountEth: string): Promise<boolean> {
    if (this.isMock) {
      await new Promise(r => setTimeout(r, 1000));
      const market = mockMarkets.find(m => m.id === marketId);
      if (market) {
        const amountWei = parseFloat(amountEth) * 1e18; // rough conversion for mock
        const currentPool = BigInt(market.outcomePools[outcomeIndex]);
        const total = BigInt(market.totalPool);
        
        market.outcomePools[outcomeIndex] = (currentPool + BigInt(Math.floor(amountWei))).toString();
        market.totalPool = (total + BigInt(Math.floor(amountWei))).toString();
        
        // Increment XP (Stored in local storage for mock persistence)
        this.incrementUserBetCount();
      }
      return true;
    }
    return false;
  }

  async resolveMarket(marketId: number, outcomeIndex: number): Promise<boolean> {
    if (this.isMock) {
      await new Promise(r => setTimeout(r, 1000));
      const market = mockMarkets.find(m => m.id === marketId);
      if (market) {
        market.resolved = true;
        market.winningOutcome = outcomeIndex;
      }
      return true;
    }
    return false;
  }

  async claimWinnings(marketId: number): Promise<boolean> {
    if (this.isMock) {
        await new Promise(r => setTimeout(r, 1000));
        alert("Winnings claimed (Mock transaction)!");
        return true;
    }
    return false;
  }

  // --- XP / LEVEL SYSTEM ---
  getUserBetCount(): number {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem('celoPulse_betCount') || '0');
  }

  private incrementUserBetCount() {
    const current = this.getUserBetCount();
    localStorage.setItem('celoPulse_betCount', (current + 1).toString());
  }
}

export const web3Service = new Web3Service();