import { NextResponse } from "next/server";
import { prisma } from "@/prisma/client";

export async function POST(request: Request) {
  try {
    const { fightId, fighterId, stakeAmount, telegramId } = await request.json();

    if (!fightId || !fighterId || !stakeAmount || !telegramId) {
      return NextResponse.json({ error: "Invalid stake details" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const starsCount = Math.round(Number(stakeAmount));
    const shellEquivalent = starsCount * 1000;

    const payload = JSON.stringify({
      fightId,
      fighterId,
      starsCount: starsCount.toString(),
      shellEquivalent: shellEquivalent.toString(),
      telegramId,
    });

    // 👇 Call Telegram Bot API to create invoice link
    const botToken = process.env.BOT_TOKEN;
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Fight Stake",
          description: `Stake ${starsCount} Stars on this fight`,
          payload,
          currency: "XTR", // Telegram Stars currency code
          prices: [{ label: "Stake", amount: starsCount }],
        }),
      }
    );

    const telegramData = await telegramRes.json();

    if (!telegramData.ok) {
      console.error("Telegram API error:", telegramData);
      return NextResponse.json(
        { error: "Failed to create invoice link" },
        { status: 500 }
      );
    }

    return NextResponse.json({ invoiceLink: telegramData.result });

  } catch (error) {
    console.error("Error preparing Stars stake:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}