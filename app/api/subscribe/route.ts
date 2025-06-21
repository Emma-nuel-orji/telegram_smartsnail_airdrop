import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { telegramId, serviceId } = await req.json();
    
    const telegramIdBigInt = BigInt(telegramId);

    // Get user
    const user = await prisma.user.findUnique({
      where: { telegramId: telegramIdBigInt },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get service
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Check if user has enough shells
    if (user.points < service.priceShells) {
      return NextResponse.json({ error: 'Insufficient shells' }, { status: 400 });
    }

    // Create transaction (PENDING status)
    const transaction = await prisma.pointTransaction.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        amount: service.priceShells,
        status: 'PENDING',
        type: 'SPEND',
      },
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      message: 'Subscription request submitted for approval',
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}