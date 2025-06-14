import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { telegramId: string } }) {
  const telegramId = BigInt(params.telegramId);

  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: {
      id: true,
      pointTransactions: {
        where: {
          status: 'APPROVED',
          service: {
            type: 'SUBSCRIPTION',
          },
        },
        orderBy: { approvedAt: 'desc' },
        take: 1,
        include: {
          service: true,
        },
      },
    },
  });

  if (!user || user.pointTransactions.length === 0) {
    return NextResponse.json({ active: false });
  }

  const tx = user.pointTransactions[0];
  const approvedAt = tx.approvedAt;
  const duration = tx.service.duration || '1 Month';

  const durationMap: Record<string, number> = {
    '1 Week': 7,
    '2 Weeks': 14,
    '1 Month': 30,
    '3 Months': 90,
    '6 Months': 180,
    '1 Year': 365,
  };

  const days = durationMap[duration] || 30;

  let expiresAt: Date | null = null;
  if (approvedAt) {
    expiresAt = new Date(approvedAt);
    expiresAt.setDate(expiresAt.getDate() + days);
  }

  return NextResponse.json({
    active: expiresAt ? new Date() < expiresAt : false,
    serviceName: tx.service.name,
    duration,
    approvedAt,
    expiresAt,
    status: tx.status,
  });
}
