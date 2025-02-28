import { NextRequest, NextResponse } from "next/server";
import { Bot } from "grammy";
import { prisma } from '@/prisma/client';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set in the environment variables");
}

const bot = new Bot(TELEGRAM_BOT_TOKEN as string);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      title,
      description,
      amount,
      label,
      bookCount,
      fxckedUpBagsQty,
      humanRelationsQty,
      telegramId,
      referrerId,
      tappingRate,
      totalPoints,
    } = body;

    // Validate inputs
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!bookCount || bookCount < 1 || !amount || amount < 0) {
      return NextResponse.json({ error: "Invalid purchase details" }, { status: 400 });
    }

    // Create a simplified payload for Telegram payment
    const payload = JSON.stringify({
      email,
      bookCount,
      telegramId
    });

    // Use the positional parameter style as expected by the Grammy library
    const invoiceLink = await bot.api.createInvoiceLink(
      title || "Book Payment",
      description || "Payment for books via Telegram Stars",
      payload,
      "", // Empty provider token for Telegram Stars
      "XTR",
      [{ 
        label: label || "Book Payment",
        amount: Math.max(1, Math.round(Number(amount))) // Ensure amount is at least 1
      }]
    );

    // Store transaction in the database
    const validOrderId = await prisma.order.findFirst({
      where: { status: "PENDING" }, 
    });

    if (!validOrderId) {
      throw new Error("Valid order ID not found.");
    }

    // Create full payload for database
    const fullPayload = JSON.stringify({
      email,
      bookCount,
      fxckedUpBagsQty,
      humanRelationsQty,
      telegramId,
      referrerId: referrerId || null,
      tappingRate,
      totalPoints,
    });

    await prisma.pendingTransaction.create({
      data: {
        email,
        amount,
        bookCount,
        fxckedUpBagsQty,
        humanRelationsQty,
        telegramId,
        referrerId,
        tappingRate,
        totalPoints,
        payloadData: fullPayload,
        status: "PENDING",
        order: {
          connect: { id: validOrderId.id },
        },
      },
    });

    // Return invoice link to frontend
    return NextResponse.json({ invoiceLink });

  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    }, { status: 500 });
  }
}