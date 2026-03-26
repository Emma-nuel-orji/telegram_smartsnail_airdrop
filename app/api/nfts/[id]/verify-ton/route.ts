import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { boc, tgUserId } = await req.json();

    // In a real production app, you would use a TON Indexer API here 
    // to verify the 'boc' actually exists on-chain.
    
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(tgUserId) }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Mark as sold and assign owner
    await prisma.nft.update({
      where: { id: params.id },
      data: { 
        isSold: true, 
        ownerId: user.id 
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}