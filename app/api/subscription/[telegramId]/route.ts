import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to handle BigInt conversion for the entire object
function serialize(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

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
    const isActive = today < expiry;

    if (!isActive) {
      return NextResponse.json({ isActive: false });
    }

    // Construct the response object
    const responseData = {
      ...subscription,
      isActive: true,
      needsSchedule: subscription.planType === "COMBAT" && (!subscription.trainingDays || (subscription.trainingDays as string[]).length === 0),
      daysRemaining: Math.max(0, Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    };

    // Use the serialize helper to prevent the BigInt error
    return NextResponse.json(serialize(responseData));

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