import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import NodeCache from 'node-cache';

// Initialize cache with a TTL of 60 seconds
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

const levels = [
  { name: 'Level 1 Camouflage', minPoints: 0, maxPoints: 1000000, color: '#d1c4e9' },
  { name: 'Level 2 Speedy', minPoints: 1000001, maxPoints: 3000000, color: '#9c27b0' },
  { name: 'Level 3 Strong', minPoints: 3000001, maxPoints: 6000000, color: '#7b1fa2' },
  { name: 'Level 4 Sensory', minPoints: 6000001, maxPoints: 10000000, color: '#6a1b9a' },
  { name: 'Level 5 African Giant/God NFT', minPoints: 10000001, maxPoints: Infinity, color: '#4a148c' },
];

const mapUserWithDetails = (level: typeof levels[number], skip: number) => (user: any, index: number) => ({
  ...user,
  username: user.username || '',
  color: level.color,
  rank: skip + index + 1,
});

export async function GET(req: NextRequest) {
  console.log('Leaderboard API hit');

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Generate a unique cache key based on page and limit
    const cacheKey = `leaderboard-page-${page}-limit-${limit}`;
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      console.log('Cache hit');
      return NextResponse.json(cachedData);
    }

    console.log('Cache miss, fetching from database');

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
          orderBy: { points: 'desc' },
          take: limit,
          skip,
        });

        return {
          level: level.name,
          levelColor: level.color,
          users: users.map(mapUserWithDetails(level, skip)),
          totalUsersInLevel: await prisma.user.count({
            where: {
              points: {
                gte: level.minPoints,
                ...(level.maxPoints !== Infinity && { lte: level.maxPoints }),
              },
            },
          }),
        };
      })
    );

    const filteredLeaderboard = leaderboard.filter((level) => level.users.length > 0);

    // Cache the fetched leaderboard data
    cache.set(cacheKey, filteredLeaderboard);

    return NextResponse.json(filteredLeaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
