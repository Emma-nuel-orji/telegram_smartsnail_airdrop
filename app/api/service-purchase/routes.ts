import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const body = await req.json();
  const { telegramId, serviceId, paymentType } = body;

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  if (user.points < service.priceShells) {
    return NextResponse.json({ error: 'Not enough shells' }, { status: 400 });
  }

  // Deduct shells from user
  await prisma.user.update({
    where: { telegramId: BigInt(telegramId) },
    data: {
      points: {
        decrement: service.priceShells,
      },
    },
  });

  // Record the service purchase using `unchecked` input
  const purchase = await prisma.purchase.create({
    data: {
      userId: user.id,
      serviceId: service.id,
      amountPaid: Number(service.priceShells),
      paymentType: paymentType ?? 'POINTS',
    },
  });

  return NextResponse.json({ success: true, purchase });
}
