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
    <div className="text-center p-8 bg-red-50 rounded-lg shadow-lg">
      <div className="flex items-center justify-center gap-4 text-red-600">
        <Link href="/" className="hover:bg-red-100 p-2 rounded-full transition-colors">
          ←
        </Link>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center p-8 bg-purple-50 rounded-lg shadow-lg">
      <div className="flex items-center justify-center gap-4 text-purple-600">
        <Link href="/" className="hover:bg-purple-100 p-2 rounded-full transition-colors">
          ←
        </Link>
        <span className="font-medium">No leaderboard data available</span>
      </div>
    </div>
  </div>
);

const getRankBadge = (rank: number) => {
  switch (rank) {
    case 1:
      return <span className="text-yellow-500 font-bold text-xl">🏆</span>;
    case 2:
      return <span className="text-gray-400 font-bold text-xl">🥈</span>;
    case 3:
      return <span className="text-amber-600 font-bold text-xl">🥉</span>;
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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="flex items-center mb-6">
          <Link 
            href="/" 
            className="p-2 hover:bg-purple-100 rounded-full transition-colors"
          >
            ←
          </Link>
          <h1 className="text-3xl font-bold text-center text-purple-800 flex-1">
            Leaderboard
          </h1>
        </div>

        {leaderboard.map((levelData, index) => (
          <div
            key={levelData.level || index}
            className="mb-8 rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-[1.01] duration-300"
            style={{
              borderColor: `${levelData.levelColor}70`,
              backgroundColor: `${levelData.levelColor}10`,
            }}
          >
            <div
              className="p-4 text-white flex items-center justify-between"
              style={{ backgroundColor: levelData.levelColor }}
            >
              <h2 className="text-xl font-bold flex items-center gap-2">
                ⭐ {levelData.level}
              </h2>
              <div className="flex items-center gap-2">
                👥 <span className="font-medium">
                  {levelData.totalUsersInLevel} users
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-purple-100 text-purple-800">
                    <th className="p-4 text-left font-semibold">Rank</th>
                    <th className="p-4 text-left font-semibold">Username</th>
                    <th className="p-4 text-right font-semibold">Points</th>
                    <th className="p-4 text-right font-semibold">Referrals</th>
                  </tr>
                </thead>
                <tbody>
                  {levelData.users?.map((user, userIndex) => (
                    <tr
                      key={user.telegramId || userIndex}
                      className="border-t hover:bg-white/50 transition-colors"
                    >
                      <td className="p-4 font-bold flex items-center gap-2">
                        {getRankBadge(user.rank)}
                        <span style={{ color: levelData.levelColor }}>
                          #{user.rank}
                        </span>
                      </td>
                      <td className="p-4 font-medium">{user.username || 'Anonymous'}</td>
                      <td className="p-4 text-right font-medium">
                        {user.points.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-medium">{user.referrals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {(!levelData.users || levelData.users.length === 0) && (
                <div className="text-center p-6 text-purple-600 font-medium">
                  No users in this level yet
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="flex justify-center gap-4 mt-6 mb-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-6 py-2 bg-purple-700 text-white rounded-full disabled:opacity-50 hover:bg-purple-800 transition-all duration-300 hover:shadow-lg disabled:hover:shadow-none font-medium"
          >
            Previous
          </button>
          <span className="px-6 py-2 bg-purple-100 rounded-full text-purple-800 font-medium">
            Page {page}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={leaderboard.every((level) => level.users.length < limit)}
            className="px-6 py-2 bg-purple-700 text-white rounded-full disabled:opacity-50 hover:bg-purple-800 transition-all duration-300 hover:shadow-lg disabled:hover:shadow-none font-medium"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;