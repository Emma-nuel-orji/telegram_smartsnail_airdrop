import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';

const redis = new Redis({ host: 'localhost', port: 6379 }); // Adjust Redis host & port if needed

// Define levels and their respective point ranges and colors
const levels = [
  { name: 'Level 1 Camouflage', minPoints: 0, maxPoints: 1000000, color: '#d1c4e9' },
  { name: 'Level 2 Speedy', minPoints: 1000001, maxPoints: 3000000, color: '#9c27b0' },
  { name: 'Level 3 Strong', minPoints: 3000001, maxPoints: 6000000, color: '#7b1fa2' },
  { name: 'Level 4 Sensory', minPoints: 6000001, maxPoints: 10000000, color: '#6a1b9a' },
  { name: 'Level 5 African Giant/God NFT', minPoints: 10000001, maxPoints: Infinity, color: '#4a148c' },
];

interface User {
  telegramId: string;
  username: string | null; // Use nullable since the `username` is potentially null
  points: number;
  referrals?: {
    id: string;
    createdAt: Date;
    referredBy: string;
    referredTo: string;
    userId: string;
  }[];
}

type UserWithDetails = {
  telegramId: string;
  username: string;
  points: number;
  referrals?: User['referrals'];
  color: string;
  rank: number;
};

// Helper function to map users with additional details like color and rank
const mapUserWithDetails = (level: typeof levels[number], skip: number) => (user: User, index: number): UserWithDetails => {
  return {
    ...user,
    username: user.username || '', // Ensure username is a string, defaulting to empty if null
    color: level.color,
    rank: skip + index + 1, // Explicitly typed index as number
  };
};

export async function GET(req: NextRequest) {
  console.log('Leaderboard API hit');

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const cacheKey = `leaderboard:${page}:${limit}`;
    let cachedLeaderboard = await redis.get(cacheKey);

    if (cachedLeaderboard) {
      console.log('Cache hit for leaderboard data');
      return NextResponse.json(JSON.parse(cachedLeaderboard));
    }

    const leaderboard = await Promise.all(
      levels.map(async (level) => {
        const users = await prisma.user.findMany({
          where: {
            points: {
              gte: level.minPoints,
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
          take: limit,
          skip,
        });

        return {
          level: level.name,
          levelColor: level.color,
          users: users.map(mapUserWithDetails(level, skip)),
          totalUsersInLevel: users.length,
        };
      })
    );

    const filteredLeaderboard = leaderboard.filter((level) => level.users.length > 0);

    await redis.set(cacheKey, JSON.stringify(filteredLeaderboard), 'EX', 3600); // Cache expires in 1 hour

    return NextResponse.json(filteredLeaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
