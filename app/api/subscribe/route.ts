import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { telegramId, serviceId, planTitle } = await req.json();
    
    if (!telegramId || !serviceId) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const telegramIdBigInt = BigInt(telegramId);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get user and Service
      const user = await tx.user.findUnique({
        where: { telegramId: telegramIdBigInt },
      });

      const service = await tx.service.findUnique({
        where: { id: serviceId },
      });

      if (!user) throw new Error('User not found');
      if (!service) throw new Error('Service not found');

      // 2. Check balance
      if (user.points < service.priceShells) {
        throw new Error('Insufficient shells');
      }

      // 3. DEDUCT POINTS FROM USER
      await tx.user.update({
        where: { id: user.id },
        data: { points: { decrement: service.priceShells } },
      });

      // --- NEW LOGIC: CREATE THE PUNCH CARD SUBSCRIPTION ---
      const durationInDays = serviceId === '3-months' ? 90 : (serviceId === '6-months' ? 180 : 1);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationInDays);

      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          planTitle: planTitle || service.name,
          startDate: new Date(),
          endDate: endDate,
          // Calculate total boxes for the punch card
          totalClasses: serviceId === '3-months' ? 36 : (serviceId === '6-months' ? 72 : 1),
          status: 'ACTIVE',
        },
      });

      // 4. Create the Spend Transaction log
      await tx.pointTransaction.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          pointsUsed: service.priceShells,
          status: 'APPROVED',
          type: 'SPEND',
        },
      });

      return subscription;
    });

    return NextResponse.json({
      success: true,
      subscriptionId: result.id,
      message: 'Subscription successful! Punch card activated.',
    });

  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' }, 
      { status: 400 }
    );
  }
}