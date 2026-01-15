'use client';
import { useEffect, useState } from 'react';
import Loader from '@/loader';
import Link from 'next/link';

interface User {
  telegramId: string;
  username: string;
  points: number;
  referrals: number;
  color: string;
  rank: number;
}

interface LevelData {
  level: string;
  levelColor: string;
  users: User[];
  totalUsersInLevel: number;
}

const LoadingState = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader />
  </div>
);

const ErrorState = ({ message, onBack }: { message: string; onBack?: () => void }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center p-8 bg-red-50 dark:bg-red-900 rounded-lg shadow-lg">
      <div className="flex items-center justify-center gap-4 text-red-600 dark:text-red-200">
      <Link href="/">
          <img
            src="/images/info/left-arrow.png" 
            
            width={40}
            height={40}
            alt="back"
          />
        </Link>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center p-8 bg-purple-50 dark:bg-purple-900 rounded-lg shadow-lg">
      <div className="flex items-center justify-center gap-4 text-purple-600 dark:text-purple-200">
      <Link href="/">
          <img
            src="/images/info/left-arrow.png" 
            
            width={40}
            height={40}
            alt="back"
          />
        </Link>
        <span className="font-medium">No leaderboard data available</span>
      </div>
    </div>
  </div>
);

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return <span className="text-yellow-500 dark:text-yellow-400 font-bold text-xl">🏆</span>;
    case 2:
      return <span className="text-gray-400 dark:text-gray-300 font-bold text-xl">🥈</span>;
    case 3:
      return <span className="text-amber-600 dark:text-amber-400 font-bold text-xl">🥉</span>;
    default:
      return null;
  }
};

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LevelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/leaderboard?page=${page}&limit=${limit}`);
        if (!res.ok) throw new Error(await res.text());

        const data = await res.json();
        if (Array.isArray(data)) setLeaderboard(data);
        else throw new Error('Invalid data format received');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [page]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!leaderboard.length) return <EmptyState />;

 return (
  <div className="min-h-screen bg-[#070707] text-white font-sans selection:bg-purple-500/30">
    <div className="container mx-auto p-4 max-w-2xl">
      
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-8 pt-4">
        <Link href="/" className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <img src="/images/info/output-onlinepngtools (6).png" width={24} height={24} alt="back" className="opacity-70" />
        </Link>
        <h1 className="text-2xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-500">
          Global Rankings
        </h1>
        <div className="w-8" /> {/* Spacer for symmetry */}
      </div>

      {leaderboard.map((levelData, index) => (
        <div key={levelData.level || index} className="mb-10">
          
          {/* Level Header Badge */}
          <div className="flex items-center gap-3 mb-4">
             <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
             <div 
               className="px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
               style={{ borderColor: levelData.levelColor, color: levelData.levelColor, backgroundColor: `${levelData.levelColor}10` }}
             >
               {levelData.level} Division
             </div>
             <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
          </div>

          {/* User List */}
          <div className="space-y-3">
            {levelData.users?.map((user) => (
              <div 
                key={user.telegramId} 
                className="relative group overflow-hidden bg-zinc-900/40 border border-white/5 rounded-2xl p-4 transition-all hover:bg-zinc-900/60 hover:border-purple-500/30"
              >
                {/* Glow Background for Top 3 */}
                {user.rank <= 3 && (
                   <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-600/10 blur-2xl rounded-full" />
                )}

                <div className="flex items-center gap-4 relative z-10">
                  {/* Rank & Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-lg font-bold">
                      {user.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-lg
                      ${user.rank === 1 ? 'bg-yellow-500 text-black' : 
                        user.rank === 2 ? 'bg-zinc-300 text-black' : 
                        user.rank === 3 ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}
                    >
                      {user.rank}
                    </div>
                  </div>

                  {/* Name & Stats */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate uppercase italic tracking-tight">
                      {user.username || 'Anonymous User'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 uppercase">
                        <img src="/images/info/referral-icon.png" className="w-2.5 h-2.5 opacity-50" alt="" />
                        {user.referrals} Ref
                      </span>
                    </div>
                  </div>

                  {/* Points Display */}
                  <div className="text-right">
                    <p className="text-xs font-black text-purple-400 leading-none">
                      {user.points.toLocaleString()}
                    </p>
                    <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1">Points</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modern Pagination */}
      <div className="flex items-center justify-between mt-10 p-2 bg-zinc-900/50 rounded-2xl border border-white/5">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="p-3 disabled:opacity-20 hover:bg-white/5 rounded-xl transition-all"
        >
          <img src="/images/info/left-arrow.png" width={20} height={20} alt="prev" className="invert" />
        </button>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          Page <span className="text-white">{page}</span>
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={leaderboard.every((level) => level.users.length < limit)}
          className="p-3 disabled:opacity-20 hover:bg-white/5 rounded-xl transition-all rotate-180"
        >
          <img src="/images/info/left-arrow.png" width={20} height={20} alt="next" className="invert" />
        </button>
      </div>
    </div>
  </div>
);
};

export default Leaderboard;
