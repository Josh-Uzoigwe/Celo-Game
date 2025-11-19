import React, { useMemo, useState } from 'react';
import { Market, MarketCategory } from '../types';
import { MOCK_IMAGES } from '../constants';
import { web3Service } from '../services/web3Service';

interface Props {
  market: Market;
  account: string | null;
  onBetSuccess: () => void;
  onChatClick: () => void;
}

export const MarketCard: React.FC<Props> = ({ market, account, onBetSuccess, onChatClick }) => {
  const [selectedOutcome, setSelectedOutcome] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [isBetting, setIsBetting] = useState(false);

  const totalPoolEth = Number(market.totalPool) / 1e18;
  const isLocked = Date.now() / 1000 > market.lockTime;
  const isResolvable = Date.now() / 1000 > market.resolveTime && !market.resolved;
  const canAdmin = account && account.toLowerCase() === market.creator.toLowerCase();

  const percentages = useMemo(() => {
    if (totalPoolEth === 0) return market.outcomes.map(() => 100 / market.outcomes.length);
    return market.outcomePools.map(pool => (Number(pool) / 1e18 / totalPoolEth) * 100);
  }, [market, totalPoolEth]);

  const handleBet = async () => {
    if (selectedOutcome === null || !betAmount || !account) return;
    setIsBetting(true);
    try {
      await web3Service.placeBet(market.id, selectedOutcome, betAmount);
      setBetAmount('');
      setSelectedOutcome(null);
      onBetSuccess();
    } catch (e) {
      alert('Bet failed');
    } finally {
      setIsBetting(false);
    }
  };

  const handleResolve = async (outcomeIdx: number) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    await web3Service.resolveMarket(market.id, outcomeIdx);
    onBetSuccess();
  };

  const handleClaim = async () => {
     await web3Service.claimWinnings(market.id);
  };

  const getCategoryIcon = (cat: MarketCategory) => {
    switch(cat) {
      case MarketCategory.CRYPTO: return '₿';
      case MarketCategory.SPORTS: return '⚽';
      case MarketCategory.POLITICS: return '⚖️';
      case MarketCategory.ENTERTAINMENT: return '🎬';
      default: return '🌍';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all overflow-hidden flex flex-col h-full">
      <div className="h-32 bg-gray-200 dark:bg-gray-700 relative">
        <img src={market.imageUrl || MOCK_IMAGES[market.category] || MOCK_IMAGES['Other']} className="w-full h-full object-cover opacity-90" alt="market cover" />
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 dark:bg-gray-900/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-celo-dark dark:text-white shadow-sm flex items-center gap-1">
            {getCategoryIcon(market.category)} {market.category}
          </span>
        </div>
        <div className="absolute top-3 right-3">
            {market.resolved ? (
                <span className="bg-celo-dark text-white px-3 py-1 rounded-full text-xs font-bold">Resolved</span>
            ) : isLocked ? (
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">Locked</span>
            ) : (
                <span className="bg-celo-green text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">Live</span>
            )}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight line-clamp-2 h-12 flex-1 mr-2">{market.title}</h3>
          <button 
            onClick={onChatClick}
            className="text-gray-400 hover:text-celo-green transition-colors p-1"
            title="Open Chat Room"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>
        </div>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{market.description}</p>

        <div className="space-y-3 flex-1">
          {market.outcomes.map((outcome, idx) => {
            const isWinner = market.resolved && market.winningOutcome === idx;
            const pct = percentages[idx];
            const isSelected = selectedOutcome === idx;
            
            return (
              <button 
                key={idx}
                onClick={() => !isLocked && !market.resolved && setSelectedOutcome(idx)}
                disabled={isLocked || market.resolved}
                className={`w-full relative group rounded-lg overflow-hidden border transition-all 
                  ${isSelected ? 'ring-2 ring-celo-green border-celo-green' : 'border-gray-200 dark:border-gray-700'} 
                  ${isWinner ? 'bg-celo-gold/20 border-celo-gold' : 'bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <div className={`absolute top-0 left-0 bottom-0 bg-celo-light dark:bg-celo-green/10 transition-all duration-500 ease-out`} style={{ width: `${pct}%` }}></div>
                <div className="relative px-3 py-2 flex justify-between items-center z-10">
                  <span className={`font-medium text-sm ${isWinner ? 'text-yellow-700 dark:text-yellow-400 font-bold' : 'text-gray-700 dark:text-gray-200'}`}>
                    {outcome} {isWinner && '🏆'}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{pct.toFixed(1)}%</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs text-gray-400 font-medium">Total Pool</span>
            <span className="text-sm font-bold text-celo-dark dark:text-white">{totalPoolEth.toFixed(2)} CELO</span>
          </div>

          {!market.resolved && !isLocked && selectedOutcome !== null && (
             <div className="flex gap-2 animate-in slide-in-from-bottom-2 fade-in">
               <input 
                 type="number" 
                 value={betAmount}
                 onChange={(e) => setBetAmount(e.target.value)}
                 placeholder="Amount (CELO)"
                 className="w-24 text-sm p-2 border rounded-lg outline-none focus:border-celo-green dark:bg-gray-900 dark:border-gray-700 dark:text-white"
               />
               <button 
                 onClick={handleBet}
                 disabled={isBetting}
                 className="flex-1 bg-celo-green text-white text-sm font-bold rounded-lg hover:bg-green-600 transition disabled:opacity-50"
               >
                 {isBetting ? '...' : 'Place Bet'}
               </button>
             </div>
          )}

          {market.resolved && (
             <button 
                onClick={handleClaim}
                className="w-full bg-celo-gold text-yellow-900 text-sm font-bold py-2 rounded-lg hover:bg-yellow-400 transition"
             >
                Claim Winnings
             </button>
          )}

          {/* Admin Controls for Demo */}
          {canAdmin && isResolvable && (
             <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700">
                <p className="text-xs text-center mb-2 font-bold text-gray-500 dark:text-gray-400">Creator Tools</p>
                <div className="flex gap-1">
                    {market.outcomes.map((o, i) => (
                        <button key={i} onClick={() => handleResolve(i)} className="flex-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 p-1 rounded transition-colors">
                            Win {o}
                        </button>
                    ))}
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};