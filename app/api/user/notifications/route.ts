import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ unreadEarnings: false });

  // Find if there are any 'EARN' transactions in the last 24 hours
  // Or you could add a 'read' boolean to your PointTransaction schema for better accuracy
  const recentEarnings = await prisma.pointTransaction.findFirst({
    where: {
      userId: userId,
      type: 'EARN',
      status: 'APPROVED',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    }
  });

  return NextResponse.json({ unreadEarnings: !!recentEarnings });
}