import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelegramUser } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { fightId: string } }
) {
  try {
    // 🔐 STANDARD AUTH (ONLY SOURCE OF TRUTH)
    const auth = await authenticateTelegramUser(request as any);

    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const telegramId = auth.telegramId;
    const fightId = params.fightId;

    // 👤 Resolve internal user
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ stakes: [], claimed: false });
    }

    // 📊 Fetch stakes
    const stakes = await prisma.stake.findMany({
      where: {
        userId: user.id,
        fightId: fightId
      },
      orderBy: { createdAt: "desc" }
    });

    // 🏁 Check claim status
    const claimed = stakes.some(s => s.status === "CLAIMED");

    // 🧹 Serialize BigInt
    const serializedStakes = stakes.map((stake) => ({
      ...stake,
      stakeAmount: stake.stakeAmount.toString(),
      initialStakeAmount: stake.initialStakeAmount.toString(),
    }));

    return NextResponse.json({
      stakes: serializedStakes,
      claimed
    });

  } catch (error: any) {
    console.error("Fetch Stakes Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stakes" },
      { status: 500 }
    );
  }
}