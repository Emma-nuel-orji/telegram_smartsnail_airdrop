// app/api/stakes/stars/route.ts
import { NextResponse } from "next/server";
import { Bot } from "grammy";
import { prisma } from "@/prisma/client";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new Bot(TELEGRAM_BOT_TOKEN!);

export async function POST(request: Request) {
  try {
    const { fightId, fighterId, stakeAmount, title, description, label, telegramId } =
      await request.json();

    // 1️⃣ Keep your validation - it's essential!
    if (!fightId || !fighterId || !stakeAmount || !telegramId) {
      return NextResponse.json({ error: "Invalid stake details" }, { status: 400 });
    }

    // 2️⃣ Ensure user exists (Essential for DB relationships)
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 3️⃣ Conversion Logic (Stars to Shells)
    const STARS_TO_SHELLS_RATIO = 1000n;
    const starsCount = BigInt(Math.round(Number(stakeAmount)));
    const shellEquivalent = starsCount * STARS_TO_SHELLS_RATIO;

    // 4️⃣ Create invoice payload
    const payload = JSON.stringify({
      fightId,
      fighterId,
      stakeAmount: shellEquivalent.toString(), // Use the shells for the payload
      telegramId,
    });

    const invoiceLink = await bot.api.createInvoiceLink(
      title || "Stake with Telegram Stars",
      description || "Support your fighter with Stars",
      payload,
      "", 
      "XTR", 
      [
        {
          label: label || "Stake with Telegram Stars",
          amount: Math.max(1, Number(starsCount)), // Telegram expects actual Star count
        },
      ]
    );

    // 5️⃣ Store stake (Record both Stars and Shells)
    const stake = await prisma.stake.create({
      data: {
        starsAmount: Number(starsCount),   // Actual Stars (e.g. 50)
        stakeAmount: shellEquivalent,      // Shells (e.g. 50,000)
        initialStakeAmount: shellEquivalent,
        stakeType: "STARS",
        status: "PENDING",
        user: { connect: { id: user.id } },
        fight: { connect: { id: fightId } },
        fighter: { connect: { id: fighterId } },
      },
    });

    // 6️⃣ Safe JSON Return (Convert BigInt to String)
    return NextResponse.json({ 
      invoiceLink,
      stake: {
        ...stake,
        stakeAmount: stake.stakeAmount.toString(),
        initialStakeAmount: stake.initialStakeAmount.toString()
      }
    });

  } catch (error) {
    console.error("Error processing Stars stake:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}