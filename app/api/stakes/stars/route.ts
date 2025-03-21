import { NextResponse } from "next/server";
import { Bot } from "grammy";
import { prisma } from '@/prisma/client';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set in the environment variables");
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fightId,
      fighterId,
      stakeAmount,
      title,
      description,
      label,
      telegramId,
    } = body;

    // Validate inputs
    if (!fightId || !fighterId || !stakeAmount || stakeAmount <= 0 || !telegramId) {
      return NextResponse.json(
        { error: "Invalid stake details" },
        { status: 400 }
      );
    }

    // Create a simplified payload for Telegram payment
    const payload = JSON.stringify({
      fightId,
      fighterId,
      stakeAmount,
      telegramId,
    });

    // Create a Telegram Stars invoice link
    const invoiceLink = await bot.api.createInvoiceLink(
      title || "Stake with Telegram Stars",
      description || "Staking Stars to support your fighter",
      payload,
      "", // Empty provider token for Telegram Stars
      "XTR", // Currency code for Telegram Stars
      [{
        label: label || "Stake with Telegram Stars",
        amount: Math.max(1, Math.round(Number(stakeAmount))) // Ensure amount is at least 1
      }]
    );

    // Store the pending stake in the database
    await prisma.stake.create({
        data: {
          userId: telegramId, // Directly assign userId (if allowed by your schema)
          fightId, // Directly assign fightId (if allowed by your schema)
          fighterId, // Directly assign fighterId (if allowed by your schema)
          stakeAmount,
          stakeType: "STARS",
          status: "PENDING",
          initialStakeAmount: stakeAmount, // Set initialStakeAmount to stakeAmount
          user: {
            connect: { id: telegramId }, // Connect to the User model
          },
          fight: {
            connect: { id: fightId }, // Connect to the Fight model
          },
          fighter: {
            connect: { id: fighterId }, // Connect to the Fighter model
          },
        },
      });

    // Return the invoice link to the frontend
    return NextResponse.json({ invoiceLink });
  } catch (error) {
    console.error("Error processing Telegram Stars payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}