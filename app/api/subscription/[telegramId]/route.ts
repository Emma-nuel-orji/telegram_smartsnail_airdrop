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
        service: true 
      }
    });

    if (!subscription) {
      return NextResponse.json(null);
    }

    const today = new Date();
    const expiry = new Date(subscription.endDate);
    
    // 1. Check if the time has actually run out
    const isActive = today < expiry;

    if (!isActive) {
      // If it's expired, we can either return null or mark it as inactive in DB
      return NextResponse.json({ isActive: false });
    }

    return NextResponse.json({
      ...subscription,
      isActive: true,
      // 2. Identify if the Sage Admin has set the days yet
      needsSchedule: subscription.planType === "COMBAT" && (!subscription.trainingDays || subscription.trainingDays.length === 0),
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