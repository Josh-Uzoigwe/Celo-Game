import React from 'react';
import { Web3Status, WalletStats } from '../types';

interface NavbarProps {
  account: string | null;
  status: Web3Status;
  onConnect: () => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
  stats: WalletStats | null;
}

const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

export const Navbar: React.FC<NavbarProps> = ({
  account,
  status,
  onConnect,
  toggleTheme,
  isDarkMode,
  stats,
}) => {
  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 dark:bg-black/70 backdrop-blur-lg border-b border-white/20 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-celo-green to-celo-gold text-white font-black flex items-center justify-center">
              SS
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white leading-none">SkySprint</p>
              <span className="text-xs uppercase tracking-[0.25em] text-gray-400">
                Play-to-Earn on Celo
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stats && (
              <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60">
                <span className="text-amber-500 text-lg">⚡</span>
                <div className="leading-tight">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    XP {stats.xp}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {stats.currentTier}
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <button
              onClick={onConnect}
              disabled={status === 'connecting' || status === 'connected'}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                status === 'connected'
                  ? 'bg-celo-light text-celo-dark border border-celo-green/30'
                  : 'bg-gradient-to-r from-celo-green to-celo-gold text-white shadow-lg shadow-celo-green/40'
              }`}
            >
              {status === 'connecting'
                ? 'Connecting...'
                : status === 'connected' && account
                ? formatAddress(account)
                : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};