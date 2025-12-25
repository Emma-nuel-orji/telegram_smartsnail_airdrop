import { NextResponse } from "next/server";
import { Bot } from "grammy";
import { prisma } from "@/prisma/client";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set in env");
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);

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

    // 2️⃣ Create invoice payload
    const payload = JSON.stringify({
      fightId,
      fighterId,
      stakeAmount,
      telegramId,
    });

    const invoiceLink = await bot.api.createInvoiceLink(
      title || "Stake with Telegram Stars",
      description || "Support your fighter with Stars",
      payload,
      "", // empty provider token for Stars
      "XTR", // Stars currency
      [
        {
          label: label || "Stake with Telegram Stars",
          amount: Math.max(1, Math.round(Number(stakeAmount))), // must be ≥ 1
        },
      ]
    );

    // 3️⃣ Store stake as PENDING until payment confirmation
    await prisma.stake.create({
      data: {
        stakeAmount,
        initialStakeAmount: stakeAmount,
        stakeType: "STARS",
        status: "PENDING",
        user: { connect: { id: user.id } },
        fight: { connect: { id: fightId } },
        fighter: { connect: { id: fighterId } },
      },
    });

    return NextResponse.json({ invoiceLink });
  } catch (error) {
    console.error("Error processing Stars stake:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
