// app/api/purchase-request/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const { telegramId, serviceId } = await req.json();

  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { partner: true }, // optional, only needed if you want partner data
  });

  if (!service) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 });
  }

  const transaction = await prisma.pointTransaction.create({
  data: {
    userId: user.id,
    serviceId: service.id,
    partnerId: service.partnerId, 
    pointsUsed: service.priceShells,
    status: "PENDING",
    type: "SPEND",
  },
});


  return NextResponse.json({ success: true, transaction });
}
