import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { authenticateTelegramUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    /* =========================
       1. AUTH (STANDARDIZED)
    ========================= */
    const auth = await authenticateTelegramUser(req);

    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

   if (!auth.telegramId) {
  return NextResponse.json({ error: "Invalid session" }, { status: 401 });
}

const telegramId = auth.telegramId;

    /* =========================
       2. INPUT
    ========================= */
    const { fightId, fighterId, stakeAmount } = await req.json();

    if (!fightId || !fighterId || !stakeAmount) {
      return NextResponse.json(
        { error: "Missing details" },
        { status: 400 }
      );
    }

    const starsCount = Math.round(Number(stakeAmount));

    /* =========================
       3. VERIFY USER EXISTS
    ========================= */
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    /* =========================
       4. MINIFIED PAYLOAD (STILL OPTIMIZED)
    ========================= */
    const payload = JSON.stringify({
      f: fightId,
      ft: fighterId,
      u: telegramId.toString(),
    });

    /* =========================
       5. CREATE INVOICE
    ========================= */
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Fight Stake",
          description: `Stake ${starsCount} Stars`,
          payload,
          provider_token: "",
          currency: "XTR",
          prices: [{ label: "Stake", amount: starsCount }],
        }),
      }
    );

    const telegramData = await telegramRes.json();

    if (!telegramData.ok) {
      console.error("Telegram error:", telegramData.description);
      return NextResponse.json(
        { error: telegramData.description },
        { status: 400 }
      );
    }

    /* =========================
       6. RESPONSE
    ========================= */
    return NextResponse.json({
      invoiceLink: telegramData.result,
    });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { error: "Server Error" },
      { status: 500 }
    );
  }
}