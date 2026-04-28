import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1. Force this route to be dynamic (prevents pre-rendering errors)
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest, 
  { params }: { params: { telegramId?: string } }
) {
  // 2. Guard clause: Ensure params exist before calling BigInt
  if (!params.telegramId) {
    return NextResponse.json({ error: "Telegram ID is required" }, { status: 400 });
  }

  try {
    const purchases = await prisma.purchase.findMany({
      where: { user: { telegramId: BigInt(params.telegramId) } },
      select: { fxckedUpBagsQty: true, humanRelationsQty: true }
    });

    const totals = purchases.reduce((acc, p) => ({
      fxckedUp: acc.fxckedUp + (p.fxckedUpBagsQty || 0),
      humanRel: acc.humanRel + (p.humanRelationsQty || 0)
    }), { fxckedUp: 0, humanRel: 0 });

    return NextResponse.json(totals);
  } catch (error) {
    console.error("Purchase aggregation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}