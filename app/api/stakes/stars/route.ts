// app/api/stakes/stars/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/prisma/client";

export async function POST(request: Request) {
  try {
    const { fightId, fighterId, stakeAmount, title, description, label, telegramId } =
      await request.json();

    if (!fightId || !fighterId || !stakeAmount || !telegramId) {
      return NextResponse.json({ error: "Invalid stake details" }, { status: 400 });
    }

    // 1️⃣ Ensure user exists
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2️⃣ Conversion Stars -> Shells
    const starsCount = BigInt(Math.round(Number(stakeAmount)));
    const shellEquivalent = starsCount * 1000n; // 1 Star = 1000 Shells

    // 3️⃣ Create invoice payload
    const payload = JSON.stringify({
      fightId,
      fighterId,
      starsCount: starsCount.toString(),
      shellEquivalent: shellEquivalent.toString(),
      telegramId,
      title,
      description,
      label,
    });

    // 4️⃣ Return payload to frontend to generate Telegram invoice
    return NextResponse.json({ payload });

  } catch (error) {
    console.error("Error preparing Stars stake:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}