import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { MarketCard } from './components/MarketCard';
import { CreateMarketModal } from './components/CreateMarketModal';
import { ChatDrawer } from './components/ChatDrawer';
import { Market, Web3Status } from './types';
import { web3Service } from './services/web3Service';

export default function App() {
  const [status, setStatus] = useState<Web3Status>('disconnected');
  const [account, setAccount] = useState<string | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'live' | 'resolved'>('all');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedMarketForChat, setSelectedMarketForChat] = useState<Market | null>(null);

  useEffect(() => {
    // Initialize dark mode from local storage or system preference
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setIsDarkMode(true);
    }
  };

  const loadMarkets = async () => {
    const data = await web3Service.getMarkets();
    setMarkets(data);
  };

  useEffect(() => {
    loadMarkets();
    // Simple polling for updates
    const interval = setInterval(loadMarkets, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    setStatus('connecting');
    try {
      const acc = await web3Service.connectWallet();
      setAccount(acc);
      setStatus('connected');
    } catch (e) {
      setStatus('disconnected');
    }
  };

  const openChat = (market: Market) => {
    setSelectedMarketForChat(market);
    setIsChatOpen(true);
  };

  const filteredMarkets = markets.filter(m => {
    if (filter === 'live') return !m.resolved;
    if (filter === 'resolved') return m.resolved;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
      <Navbar 
        account={account} 
        status={status} 
        onConnect={handleConnect} 
        onCreateClick={() => setShowCreateModal(true)}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />

      {/* Hero Section */}
      <div className="bg-celo-dark dark:bg-black text-white pt-16 pb-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-celo-green/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-celo-gold/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Predict the <span className="text-transparent bg-clip-text bg-gradient-to-r from-celo-green to-celo-gold">Future</span>.
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            The decentralized prediction market on Celo. Bet on sports, crypto, and global events with full transparency and instant payouts.
          </p>
          {!account && (
            <button 
              onClick={handleConnect}
              className="bg-white text-celo-dark px-8 py-3 rounded-full font-bold hover:bg-gray-100 transition shadow-lg shadow-white/10"
            >
              Start Predicting
            </button>
          )}
        </div>
      </div>

      {/* Market Filters */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow-lg inline-flex gap-1 transition-colors duration-200">
          {(['all', 'live', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filter === f ? 'bg-celo-dark text-white shadow-md dark:bg-celo-green' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Market Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-8">Trending Markets</h2>
        
        {markets.length === 0 ? (
           <div className="text-center py-20">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-celo-green mx-auto mb-4"></div>
             <p className="text-gray-500 dark:text-gray-400">Loading markets from the blockchain...</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredMarkets.map(market => (
              <MarketCard 
                key={market.id} 
                market={market} 
                account={account}
                onBetSuccess={loadMarkets}
                onChatClick={() => openChat(market)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateMarketModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadMarkets}
      />

      <ChatDrawer 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        market={selectedMarketForChat}
        account={account}
      />
    </div>
  );
}