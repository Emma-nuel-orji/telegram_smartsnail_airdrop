import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { fighterId } = req.query;

  if (!fighterId || typeof fighterId !== 'string') {
    return res.status(400).json({ error: 'Fighter ID is required' });
  }

  try {
    // Fetch total stars for the fighter
    const totalStars = await prisma.stake.aggregate({
      where: { 
        fighterId,
        stakeType: 'STARS', // Filter by stakeType = STARS
      },
      _sum: { stakeAmount: true }, // Aggregate stakeAmount for stars
    });

    // Fetch total points for the fighter
    const totalPoints = await prisma.stake.aggregate({
      where: { 
        fighterId,
        stakeType: 'POINTS', // Filter by stakeType = POINTS
      },
      _sum: { stakeAmount: true }, // Aggregate stakeAmount for points
    });

    res.status(200).json({
      stars: totalStars._sum.stakeAmount || 0, // Use stakeAmount for stars
      points: totalPoints._sum.stakeAmount || 0, // Use stakeAmount for points
    });
  } catch (error) {
    console.error('Error fetching total support:', error);
    res.status(500).json({ error: 'Failed to fetch total support' });
  }
}