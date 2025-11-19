import React from 'react';
import { Web3Status, getLevelInfo } from '../types';
import { web3Service } from '../services/web3Service';

interface NavbarProps {
  account: string | null;
  status: Web3Status;
  onConnect: () => void;
  onCreateClick: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ account, status, onConnect, onCreateClick, isDarkMode, toggleTheme }) => {
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  
  // Get User Level Info
  const betCount = web3Service.getUserBetCount();
  const level = getLevelInfo(betCount);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-8 h-8 bg-celo-green rounded-full flex items-center justify-center text-white font-bold text-lg">
              C
            </div>
            <span className="font-bold text-xl text-celo-dark dark:text-white tracking-tight">CeloPulse</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
             {/* User Level Badge (Only if connected) */}
             {status === 'connected' && (
                <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border ${level.bg} ${level.border}`}>
                   <span className="text-base">{level.icon}</span>
                   <div className="flex flex-col leading-none">
                     <span className={`text-xs font-bold ${level.color} uppercase tracking-wider`}>{level.title}</span>
                     <span className="text-[10px] text-gray-500 dark:text-gray-400">{betCount} Bets Placed</span>
                   </div>
                </div>
             )}

             {/* Theme Toggle */}
             <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                 // Sun Icon
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              ) : (
                 // Moon Icon
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              )}
            </button>

            <button 
              onClick={onCreateClick}
              className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-celo-green dark:hover:text-celo-green transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Create Market
            </button>

            <button
              onClick={onConnect}
              disabled={status === 'connecting' || status === 'connected'}
              className={`
                px-5 py-2 rounded-full font-semibold text-sm transition-all shadow-sm
                ${status === 'connected' 
                  ? 'bg-celo-light text-celo-green border border-celo-green/20 dark:bg-gray-800 dark:border-gray-700' 
                  : 'bg-celo-green text-white hover:bg-green-600 hover:shadow-md'}
              `}
            >
              {status === 'connecting' ? 'Connecting...' : 
               status === 'connected' && account ? formatAddress(account) : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};