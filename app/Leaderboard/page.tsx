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

  const renderBackArrow = () => (
    <Link href="/" className="flex items-center">
      <img
        src="/images/left-arrow.png"
        width={24}
        height={24}
        alt="back"
        className="mr-2"
      />
    </Link>
  );
  
  if (loading) return <Loader />;
  if (error)
    return (
      <div className="text-center p-4">
        <div className="flex items-center justify-center gap-z">
          {renderBackArrow()}
          <span className="text-red-500">{error}</span>
        </div>
      </div>
    );
  if (!leaderboard.length)
    return (
      <div className="text-center p-4">
        <div className="flex items-center justify-center gap-2">
          {renderBackArrow()}
          <span className="text-purple-600">No leaderboard data available</span>
        </div>
      </div>
    );
  

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {renderBackArrow()}
      <h1 className="text-3xl font-bold mb-6 text-center text-purple-800">
        Leaderboard
      </h1>

      {leaderboard.map((levelData, index) => (
        <div
          key={levelData.level || index}
          className="mb-8 border rounded-lg overflow-hidden shadow-lg"
          style={{
            borderColor: `${levelData.levelColor}70`,
            backgroundColor: `${levelData.levelColor}10`,
          }}
        >
          <h2
            className="text-xl font-semibold p-4 text-center text-white"
            style={{ backgroundColor: levelData.levelColor }}
          >
            {levelData.level} ({levelData.totalUsersInLevel} users)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-purple-100 text-purple-800">
                  <th className="p-3 text-left font-semibold">Rank</th>
                  <th className="p-3 text-left font-semibold">Username</th>
                  <th className="p-3 text-right font-semibold">Points</th>
                  <th className="p-3 text-right font-semibold">Referrals</th>
                </tr>
              </thead>
              <tbody>
                {levelData.users?.map((user, userIndex) => (
                  <tr
                    key={user.telegramId || userIndex}
                    className="border-t hover:bg-purple-50 transition-colors"
                  >
                    <td
                      className="p-3 font-bold"
                      style={{ color: levelData.levelColor }}
                    >
                      #{user.rank}
                    </td>
                    <td className="p-3">{user.username || 'Anonymous'}</td>
                    <td className="p-3 text-right">
                      {user.points.toLocaleString()}
                    </td>
                    <td className="p-3 text-right">{user.referrals}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!levelData.users || levelData.users.length === 0) && (
              <div className="text-center p-4 text-purple-600">
                No users in this level yet
              </div>
            )}
          </div>
        </div>
      ))}

      <div className="flex justify-center gap-4 mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-purple-700 text-white rounded disabled:opacity-50 hover:bg-purple-800 transition-colors"
        >
          Previous
        </button>
        <span className="px-4 py-2 bg-purple-100 rounded text-purple-800">
          Page {page}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={leaderboard.every((level) => level.users.length < limit)}
          className="px-4 py-2 bg-purple-700 text-white rounded disabled:opacity-50 hover:bg-purple-800 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Leaderboard;
