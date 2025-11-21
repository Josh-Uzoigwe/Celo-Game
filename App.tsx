import React, { useEffect, useMemo, useState } from 'react';
import { Navbar } from './components/Navbar';
import { RoundCard } from './components/RoundCard';
import {
  Boost,
  GameplayHint,
  LeaderboardEntry,
  RewardTier,
  RoundInfo,
  WalletStats,
  Web3Status,
  formatAddress,
} from './types';
import { web3Service } from './services/web3Service';

const gameplayHints: GameplayHint[] = [
  { label: 'Seed Sync', value: 'Deterministic', detail: 'Each lobby reveals seed hash so runs stay fair.', icon: '🔐' },
  { label: 'Jackpot Boost', value: '+10%', detail: 'Every failed lobby rolls into the weekly mega pool.', icon: '💰' },
  { label: 'Latency Mask', value: '<80ms', detail: 'Client preloads assets and buffers taps for Web3 signing.', icon: '⚡' },
];

export default function App() {
  const [status, setStatus] = useState<Web3Status>('disconnected');
  const [account, setAccount] = useState<string | null>(null);
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [ctaMessage, setCtaMessage] = useState<string>('');
  const [previewScore, setPreviewScore] = useState<number>(31200);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const activeRound = useMemo(
    () => rounds.find((round) => round.id === activeRoundId),
    [rounds, activeRoundId]
  );

  useEffect(() => {
    if (
      localStorage.theme === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const [roundData, tiers] = await Promise.all([
        web3Service.getRounds(),
        Promise.resolve(web3Service.getRewardSchedule()),
      ]);
      setRounds(roundData);
      setRewardTiers(tiers);
      setActiveRoundId(roundData[0]?.id ?? null);
      setWalletStats(await web3Service.getWalletStats());
      setBoosts(await web3Service.getBoosts());
    };
    init();
  }, []);

  useEffect(() => {
    if (!activeRoundId) return;
    const load = async () => {
      const lb = await web3Service.getLeaderboard(activeRoundId);
      setLeaderboard(lb);
    };
    load();
  }, [activeRoundId]);

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

  const handleConnect = async () => {
    setStatus('connecting');
    try {
      const addr = await web3Service.connectWallet();
      setAccount(addr);
      setStatus('connected');
      setWalletStats(await web3Service.getWalletStats());
      setBoosts(await web3Service.getBoosts());
    } catch (error) {
      console.error(error);
      setStatus('disconnected');
    }
  };

  const handleJoinRound = async (round: RoundInfo) => {
    if (!account) {
      await handleConnect();
      return;
    }
    setCtaMessage('Joining lobby...');
    const { prizePool, players } = await web3Service.joinRound(round.id);
    setRounds((prev) =>
      prev.map((r) => (r.id === round.id ? { ...r, prizePoolCelo: prizePool, players } : r))
    );
    setCtaMessage('Entry locked! See you on the runway.');
    setTimeout(() => setCtaMessage(''), 2400);
  };

  const handleSubmitScore = async () => {
    if (!activeRoundId) return;
    if (!account) {
      await handleConnect();
      return;
    }
    const delta = Math.floor(Math.random() * 5000);
    setPreviewScore((prev) => prev + delta);
    const lb = await web3Service.submitMockScore(activeRoundId, delta);
    setLeaderboard(lb);
    setCtaMessage('🔥 Relayer accepted your score (mock)');
    setTimeout(() => setCtaMessage(''), 2600);
  };

  const handleClaimRewards = async () => {
    setCtaMessage('Claiming from smart contract...');
    await web3Service.claimRewards();
    setCtaMessage('Rewards claimed! Check your Valora wallet.');
    setTimeout(() => setCtaMessage(''), 2600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-white">
      <Navbar
        account={account}
        status={status}
        onConnect={handleConnect}
        toggleTheme={toggleTheme}
        isDarkMode={isDarkMode}
        stats={walletStats}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-celo-dark to-black text-white p-8">
          <div className="absolute inset-y-0 right-0 w-1/2 opacity-30 blur-3xl bg-celo-green"></div>
          <div className="relative z-10 space-y-6">
            <p className="uppercase text-sm tracking-[0.5em] text-white/80">SkySprint Arcade</p>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">
              Tap. Dodge. Cash Out.
              <span className="text-celo-gold block">CELO-backed prize pools every 60s.</span>
            </h1>
            <p className="text-lg text-white/80 max-w-2xl">
              Mobile-first play-to-earn built on Celo. Stake micro-entry fees, race through deterministic levels,
              and let the smart contract distribute prizes instantly.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-white/90">
              <span className="px-4 py-2 rounded-full bg-white/20 backdrop-blur">Deterministic seeds</span>
              <span className="px-4 py-2 rounded-full bg-white/20 backdrop-blur">Jackpot rollover</span>
              <span className="px-4 py-2 rounded-full bg-white/20 backdrop-blur">Relayer anti-cheat</span>
            </div>
            {!account && (
              <button
                className="px-5 py-3 rounded-2xl bg-white text-celo-dark font-bold w-full sm:w-auto shadow-xl shadow-celo-gold/40"
                onClick={handleConnect}
              >
                Connect Celo Wallet
              </button>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Live Sprints</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {rounds.length} rounds • {rewardTiers.length} reward tiers
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {rounds.map((round) => (
                <RoundCard
                  key={round.id}
                  round={round}
                  isActive={round.id === activeRoundId}
                  onSelect={setActiveRoundId}
                  onJoin={handleJoinRound}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white/80 dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800 backdrop-blur">
              <h3 className="font-semibold mb-3">Wallet Status</h3>
              {walletStats ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Connected as {account ? formatAddress(account) : 'guest'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span>Tier</span>
                    <strong>{walletStats.currentTier}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>XP</span>
                    <strong>{walletStats.xp}</strong>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {walletStats.badges.map((badge) => (
                      <span key={badge} className="px-3 py-1 rounded-full bg-celo-light text-celo-dark text-xs font-semibold">
                        {badge}
                      </span>
                    ))}
                  </div>
                  <button
                    className="w-full mt-4 py-2 rounded-xl bg-gradient-to-r from-celo-green to-celo-gold text-white font-semibold"
                    onClick={handleClaimRewards}
                  >
                    Claim Rewards
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Loading stats...</p>
              )}
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white">
              <h3 className="font-semibold mb-3">Boost Lab</h3>
              <div className="space-y-3">
                {boosts.map((boost) => (
                  <div
                    key={boost.id}
                    className={`p-3 rounded-xl border ${
                      boost.unlocked ? 'border-celo-green/60 bg-white/10' : 'border-white/10 bg-black/20 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{boost.title}</p>
                      <span className="text-xs uppercase tracking-wide">{boost.costXp} XP</span>
                    </div>
                    <p className="text-sm text-white/70">{boost.description}</p>
                    <p className="text-xs mt-1">{boost.unlocked ? 'Unlocked' : 'Reach more XP to unlock'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="p-6 rounded-3xl bg-white/90 dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800 backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Leaderboard</h3>
              {activeRound && (
                <span className="text-sm text-gray-500">Round #{activeRound.id} • {leaderboard.length} pilots</span>
              )}
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-gray-500 text-sm">No scores yet. Be the first to submit.</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((entry) => (
                  <div
                    key={`${entry.player}-${entry.rank}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/70"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-black text-celo-green">{entry.rank}</span>
                      <div>
                        <p className="font-semibold">{entry.player}</p>
                        <p className="text-xs text-gray-500">Streak {entry.streak} • {entry.xp} XP</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold">{entry.score.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
            <button
              className="mt-5 w-full py-3 rounded-2xl bg-gradient-to-r from-celo-green to-celo-gold text-white font-semibold"
              onClick={handleSubmitScore}
            >
              Submit Score Snapshot
            </button>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white/90 dark:bg-gray-900/80 border border-gray-100 dark:border-gray-800 backdrop-blur">
              <h3 className="text-xl font-bold mb-4">Reward Split</h3>
              <div className="space-y-3">
                {rewardTiers.map((tier) => (
                  <div key={tier.placement} className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{tier.placement}</p>
                      {tier.note && <p className="text-xs text-gray-500">{tier.note}</p>}
                    </div>
                    <p className="text-lg font-bold text-celo-green">{(tier.bps / 100).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-celo-green/20 to-celo-gold/20 border border-celo-green/30 text-gray-800 dark:text-white">
              <h3 className="text-xl font-bold mb-4">Gameplay Telemetry</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {gameplayHints.map((hint) => (
                  <div key={hint.label} className="p-3 rounded-2xl bg-white/60 dark:bg-gray-900/60">
                    <p className="text-sm text-gray-500">{hint.label}</p>
                    <p className="text-lg font-semibold flex items-center gap-1">
                      {hint.icon} {hint.value}
                    </p>
                    <p className="text-xs text-gray-500">{hint.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-black text-white">
              <h3 className="text-xl font-bold mb-2">Practice Run</h3>
              <p className="text-sm text-white/70 mb-4">
                Tap the button to simulate a client-side run. We animate the score locally while the backend validates
                and relays the signed payload.
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-white/70 uppercase tracking-[0.4em]">Preview Score</span>
                <p className="text-4xl font-black">{previewScore.toLocaleString()}</p>
              </div>
              <button
                className="mt-5 w-full py-3 rounded-2xl bg-white text-black font-semibold"
                onClick={() => setPreviewScore((prev) => prev + Math.floor(Math.random() * 1500))}
              >
                Tap Combo +50
              </button>
            </div>
          </div>
        </section>

        {ctaMessage && (
          <div className="p-4 rounded-2xl bg-celo-dark/90 text-white text-center shadow-lg">
            {ctaMessage}
          </div>
        )}
      </main>
    </div>
  );
}