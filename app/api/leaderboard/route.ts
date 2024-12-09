import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Define the point ranges for each level and their corresponding colors
const levels = [
  { name: 'Level 1 Camouflage', minPoints: 0, maxPoints: 1000000, color: '#d1c4e9' },
  { name: 'Level 2 Speedy', minPoints: 1000001, maxPoints: 3000000, color: '#9c27b0' },
  { name: 'Level 3 Strong', minPoints: 3000001, maxPoints: 6000000, color: '#7b1fa2' },
  { name: 'Level 4 Sensory', minPoints: 6000001, maxPoints: 10000000, color: '#6a1b9a' },
  { name: 'Level 5 African Giant/God NFT', minPoints: 10000001, maxPoints: Infinity, color: '#4a148c' },
];

export async function GET(req: NextRequest) {
  try {
    const leaderboard = await Promise.all(levels.map(async (level) => {
      const users = await prisma.user.findMany({
        where: {
          points: {
            gte: level.minPoints, // Always apply the minPoints
            // Apply lte only if maxPoints is not Infinity
            ...(level.maxPoints !== Infinity && { lte: level.maxPoints }),
          },
        },
        select: {
          telegramId: true,
          username: true,
          points: true,
          referrals: true,
        },
        orderBy: {
          points: 'desc',
        },
        take: 20,
      });

      // Add color to each user based on their level
      const usersWithColor = users.map(user => ({
        ...user,
        color: level.color,
        rank: users.indexOf(user) + 1, // Add ranking within the level
      }));

      return {
        level: level.name,
        levelColor: level.color,
        users: usersWithColor,
        totalUsersInLevel: usersWithColor.length,
      };
    }));

    // Optional: Filter out levels with no users
    const filteredLeaderboard = leaderboard.filter(level => level.users.length > 0);

    return NextResponse.json(filteredLeaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch leaderboard', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
