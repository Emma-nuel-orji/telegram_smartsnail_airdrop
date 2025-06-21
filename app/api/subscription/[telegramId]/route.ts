import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { telegramId: string } }) {
  const telegramId = BigInt(params.telegramId);

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        pointTransactions: {
          where: {
            service: {
              type: 'SUBSCRIPTION',
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            service: true,
          },
        },
      },
    });

    if (!user || user.pointTransactions.length === 0) {
      return NextResponse.json(null);
    }

    const tx = user.pointTransactions[0];
    const service = tx.service;

    // Check if it's still active
    let isActive = false;
    let expiresAt = null;

    if (tx.status === 'APPROVED' && tx.approvedAt) {
      const durationMap: Record<string, number> = {
        '1 Week': 7,
        '2 Weeks': 14,
        '1 Month': 30,
        '3 Months': 90,
        '6 Months': 180,
        '1 Year': 365,
      };

      const days = service.duration ? durationMap[service.duration] || 30 : 30;

      expiresAt = new Date(tx.approvedAt);
      expiresAt.setDate(expiresAt.getDate() + days);
      isActive = new Date() < expiresAt;
    }

    // Return data in the format frontend expects
    return NextResponse.json({
      id: service.id,
      name: service.name,
      duration: service.duration,
      priceShells: service.price,
      approvedAt: tx.approvedAt,
      status: tx.status,
      active: isActive,
      expiresAt,
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
  }
}