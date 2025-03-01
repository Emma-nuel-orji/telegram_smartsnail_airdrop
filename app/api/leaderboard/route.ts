import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import NodeCache from 'node-cache';

// Types
interface Level {
  name: string;
  minPoints: number;
  maxPoints: number;
  color: string;
}

interface PrismaUser {
  telegramId: bigint;
  username: string | null;
  points: bigint;
  referrals: {
    id: string;
    createdAt: Date;
    referrerId: bigint;
    referredId: bigint;
  }[];
}

interface LeaderboardUser {
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
  users: LeaderboardUser[];
  totalUsersInLevel: number;
}

// Constants
const CACHE_TTL = 60; // Cache time to live in seconds
const CHECK_PERIOD = 120; // Cache check period in seconds
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

// Initialize cache
const cache = new NodeCache({ 
  stdTTL: CACHE_TTL, 
  checkperiod: CHECK_PERIOD,
  useClones: false
});

// Level definitions
const LEVELS: Level[] = [
  { name: 'Level 1 Camouflage', minPoints: 0, maxPoints: 1000000, color: '#d1c4e9' },
  { name: 'Level 2 Speedy', minPoints: 1000001, maxPoints: 3000000, color: '#9c27b0' },
  { name: 'Level 3 Strong', minPoints: 3000001, maxPoints: 6000000, color: '#7b1fa2' },
  { name: 'Level 4 Sensory', minPoints: 6000001, maxPoints: 10000000, color: '#6a1b9a' },
  { name: 'Level 5 African Giant/God NFT', minPoints: 10000001, maxPoints: Infinity, color: '#4a148c' },
];

// Utility functions
const logError = (error: unknown, context: string) => {
  const err = error instanceof Error ? error : new Error(String(error));
  console.error(`[Leaderboard API] ${context}:`, {
    message: err.message,
    stack: err.stack,
    cause: err.cause,
    timestamp: new Date().toISOString()
  });
};

const generateCacheKey = (page: number, limit: number): string => 
  `leaderboard-page-${page}-limit-${limit}`;

const parseQueryParams = (searchParams: URLSearchParams) => {
  const page = Math.max(1, parseInt(searchParams.get('page') || String(DEFAULT_PAGE), 10));
  const limit = Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10));
  return { page, limit };
};

const mapUserWithDetails = (level: Level, skip: number) => 
  (user: PrismaUser, index: number): LeaderboardUser => ({
    telegramId: user.telegramId.toString(),
    username: user.username || 'Anonymous',
    points: Number(user.points),
    referrals: user.referrals.length,
    color: level.color,
    rank: skip + index + 1,
  });

// Database queries
const fetchUsersForLevel = async (level: Level, limit: number, skip: number): Promise<LevelData> => {
  const [users, totalUsersInLevel] = await Promise.all([
    prisma.user.findMany({
      where: {
        points: {
          gte: BigInt(level.minPoints),
          ...(level.maxPoints !== Infinity && { lte: BigInt(level.maxPoints) }),
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
    }),
    prisma.user.count({
      where: {
        points: {
          gte: BigInt(level.minPoints),
          ...(level.maxPoints !== Infinity && { lte: BigInt(level.maxPoints) }),
        },
      },
    })
  ]);

  return {
    level: level.name,
    levelColor: level.color,
    users: users.map(mapUserWithDetails(level, skip)),
    totalUsersInLevel,
  };
};

// Main handler
export async function GET(req: NextRequest) {
  console.log('[Leaderboard API] Request received:', req.url);
  
  try {
    const { searchParams } = new URL(req.url);
    const { page, limit } = parseQueryParams(searchParams);
    const skip = (page - 1) * limit;

    // Check cache
    const cacheKey = generateCacheKey(page, limit);
    const cachedData = cache.get<LevelData[]>(cacheKey);

    if (cachedData) {
      console.log('[Leaderboard API] Cache hit for:', cacheKey);
      return NextResponse.json(cachedData);
    }

    console.log('[Leaderboard API] Cache miss, fetching from database');

    // Fetch data for all levels concurrently
    const leaderboard = await Promise.all(
      LEVELS.map(level => fetchUsersForLevel(level, limit, skip))
    );

    // Filter out empty levels and cache results
    const filteredLeaderboard = leaderboard.filter(level => level.users.length > 0);
    cache.set(cacheKey, filteredLeaderboard);

    console.log('[Leaderboard API] Successfully fetched and cached data');
    return NextResponse.json(filteredLeaderboard);

  } catch (error) {
    logError(error, 'Failed to fetch leaderboard data');
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data. Please try again later.' }, 
      { status: 500 }
    );
  }
}