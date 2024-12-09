'use client';

import { useEffect, useState } from 'react';

interface User {
  telegramId: string;
  username: string;
  points: number;
  referrals: number;
  nft: boolean;
  color: string; // Assuming color is a field for dynamic styling
}

interface LevelData {
  level: string;
  users: User[];
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LevelData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data on component mount
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/leaderboard'); // This will hit your backend API route
        if (!res.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const data: LevelData[] = await res.json();
        setLeaderboard(data);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        setError('Failed to load leaderboard. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="leaderboard-container bg-purple-50 text-purple-800 p-6 rounded-lg transition-opacity duration-500 opacity-100">
      <h1 className="text-4xl font-bold text-center mb-6 animate__animated animate__fadeIn">
        Leaderboard
      </h1>
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 border-solid"></div>
        </div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : (
        leaderboard.map((levelData) => (
          <div
            key={levelData.level}
            className="level-section mb-8 transition-all transform hover:scale-105"
          >
            <h2 className="text-2xl font-semibold text-purple-700">{levelData.level}</h2>
            <table className="leaderboard-table w-full mt-4 table-auto border-separate border-spacing-2">
              <thead>
                <tr>
                  <th className="text-left text-purple-600">Rank</th>
                  <th className="text-left text-purple-600">User</th>
                  <th className="text-left text-purple-600">Points</th>
                  <th className="text-left text-purple-600">Referrals</th>
                  <th className="text-left text-purple-600">NFT</th>
                </tr>
              </thead>
              <tbody className="opacity-0 animate__animated animate__fadeIn animate__delay-1s">
                {levelData.users.map((user, index) => (
                  <tr
                    key={user.telegramId}
                    style={{ backgroundColor: user.color }}
                    className="hover:bg-purple-100 transition-all duration-300"
                  >
                    <td>{index + 1}</td>
                    <td>{user.username}</td>
                    <td>{user.points}</td>
                    <td>{user.referrals}</td>
                    <td>{user.nft ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
};

export default Leaderboard;
