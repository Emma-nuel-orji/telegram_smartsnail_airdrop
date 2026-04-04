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
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get('partnerId'); // Grab the gymId from URL
    const telegramId = BigInt(params.telegramId);

    // CRITICAL: Filter by the specific partner/gym
    const subscription = await prisma.subscription.findFirst({
      where: {
        user: { telegramId: telegramId },
        status: "ACTIVE",
        // Only get the sub for THIS gym
        ...(partnerId && { service: { partnerId: partnerId } }) 
      },
      orderBy: { startDate: 'desc' },
      include: { 
        service: true 
      }
    });

    console.log(`🔍 [SUB CHECK] User: ${params.telegramId} | Partner: ${partnerId} | Found: ${!!subscription}`);

    if (!subscription) {
      return NextResponse.json(null);
    }

    const today = new Date();
    const expiry = new Date(subscription.endDate);
    
    // Safety check: Is it actually still valid?
    if (today > expiry) {
      return NextResponse.json({ isActive: false });
    }

    const responseData = {
      ...subscription,
      isActive: true,
      planTitle: subscription.service?.name || "Standard Plan",
      daysRemaining: Math.max(0, Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
    };

    return NextResponse.json(serialize(responseData));

  } catch (error) {
    console.error('🔥 Error fetching sub:', error);
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