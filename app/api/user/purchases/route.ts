import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { telegramId: string } }) {
  const purchases = await prisma.purchase.findMany({
    where: { user: { telegramId: BigInt(params.telegramId) } },
    select: { fxckedUpBagsQty: true, humanRelationsQty: true }
  });

  const totals = purchases.reduce((acc, p) => ({
    fxckedUp: acc.fxckedUp + (p.fxckedUpBagsQty || 0),
    humanRel: acc.humanRel + (p.humanRelationsQty || 0)
  }), { fxckedUp: 0, humanRel: 0 });

  return NextResponse.json(totals);
}