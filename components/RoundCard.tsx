import React from 'react';
import { RoundInfo } from '../types';

interface RoundCardProps {
  round: RoundInfo;
  isActive: boolean;
  onSelect: (roundId: number) => void;
  onJoin: (round: RoundInfo) => void;
}

const statusCopy: Record<RoundInfo['status'], { label: string; color: string }> = {
  lobby: { label: 'Lobby', color: 'bg-amber-100 text-amber-700' },
  live: { label: 'Live', color: 'bg-green-100 text-green-700' },
  settled: { label: 'Settled', color: 'bg-gray-200 text-gray-600' },
};

export const RoundCard: React.FC<RoundCardProps> = ({ round, isActive, onSelect, onJoin }) => {
  const status = statusCopy[round.status];

  return (
    <div
      className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white/80 dark:bg-gray-900/80 backdrop-blur shadow-sm hover:shadow-xl ${
        isActive ? 'border-celo-green ring-2 ring-celo-green/30' : 'border-gray-100 dark:border-gray-800'
      }`}
      onClick={() => onSelect(round.id)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">Round #{round.id}</span>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{round.title}</h3>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${status.color}`}>{status.label}</span>
      </div>

      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">{round.description}</p>

      <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-200">
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Entry Fee</p>
          <p className="text-lg font-semibold">{round.entryFeeCelo} CELO</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Prize Pool</p>
          <p className="text-lg font-semibold">{round.prizePoolCelo.toFixed(2)} CELO</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Players</p>
          <p className="text-lg font-semibold">{round.players}/{round.minPlayers}</p>
        </div>
        <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">Jackpot Boost</p>
          <p className="text-lg font-semibold">+{round.jackpotBoost}%</p>
        </div>
      </div>

      <button
        className={`mt-5 w-full py-3 rounded-xl text-sm font-bold transition-all ${
          round.status === 'live'
            ? 'bg-gradient-to-r from-celo-green to-celo-gold text-white shadow-lg shadow-celo-green/40 hover:translate-y-0.5'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (round.status === 'live') onJoin(round);
        }}
        disabled={round.status !== 'live'}
      >
        {round.status === 'live' ? 'Jump In' : 'Waiting Lobby'}
      </button>
    </div>
  );
};

