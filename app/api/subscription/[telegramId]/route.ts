import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { telegramId: string } }) {
  try {
    const telegramId = BigInt(params.telegramId);

    const subscription = await prisma.subscription.findFirst({
      where: {
        user: { telegramId: telegramId },
        status: "ACTIVE"
      },
      orderBy: { startDate: 'desc' },
      include: { 
        service: true // This gets the duration/price info
      }
    });

    if (!subscription) {
      return NextResponse.json(null);
    }

    const today = new Date();
    const expiry = new Date(subscription.endDate);
    const isActive = today < expiry;

    return NextResponse.json({
      ...subscription,
      isActive,
      // Helper for the Punch Card UI
      daysRemaining: Math.max(0, Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    });
  } catch (error) {
    console.error('Error fetching gym sub:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { telegramId: string } }) {
  try {
    const telegramId = BigInt(params.telegramId);

    // Cancel the active subscription
    const updated = await prisma.subscription.updateMany({
      where: {
        user: { telegramId },
        status: 'ACTIVE'
      },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json({ success: updated.count > 0 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }
}