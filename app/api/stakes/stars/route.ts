import { NextResponse } from "next/server";
import { prisma } from "@/prisma/client";

export async function POST(request: Request) {
  try {
    const { fightId, fighterId, stakeAmount, telegramId } = await request.json();

    // 1. Validation
    if (!fightId || !fighterId || !stakeAmount || !telegramId) {
      return NextResponse.json({ error: "Missing details" }, { status: 400 });
    }

    const starsCount = Math.round(Number(stakeAmount));

    // 2. THE MINI-PAYLOAD (Strictly < 128 bytes)
    // We use single letters to save space
    const payload = JSON.stringify({
      f: fightId,   
      ft: fighterId,
      u: telegramId 
    });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    // 3. Create Invoice Link
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Fight Stake",
          description: `Stake ${starsCount} Stars`,
          payload: payload, 
          provider_token: "", // Required empty for Stars
          currency: "XTR",
          prices: [{ label: "Stake", amount: starsCount }],
        }),
      }
    );

    const telegramData = await telegramRes.json();

    if (!telegramData.ok) {
      console.error("Telegram error:", telegramData.description);
      return NextResponse.json({ error: telegramData.description }, { status: 400 });
    }

    return NextResponse.json({ invoiceLink: telegramData.result });

  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}