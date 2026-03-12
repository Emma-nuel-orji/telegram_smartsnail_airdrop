import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { telegramId, serviceId } = await req.json();
    
    if (!telegramId || !serviceId) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    const telegramIdBigInt = BigInt(telegramId);

    // Run everything in a transaction to ensure points are actually taken
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

      // 4. Create the Spend Transaction
      const transaction = await tx.pointTransaction.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          pointsUsed: service.priceShells,
          status: 'COMPLETED', // Set to COMPLETED since shells are now gone
          type: 'SPEND',
        },
      });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      transactionId: result.id,
      message: 'Subscription successful! Shells deducted.',
    });

  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' }, 
      { status: 400 }
    );
  }
}