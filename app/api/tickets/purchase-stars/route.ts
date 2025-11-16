import { NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { Bot } from "grammy";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing from .env");
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);

export async function POST(req: Request) {
  try {
    const { telegramId, userName, ticketType, quantity, totalCost, pricePerTicket } =
      await req.json();

    if (!telegramId || !ticketType || !quantity || !totalCost) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // 1️⃣ Prepare payload for Telegram Stars
    const payload = JSON.stringify({
      ticketType,
      quantity,
      telegramId,
      type: "ticket_purchase"
    });

    // 2️⃣ Calculate amount (integer, ≥1)
    const amountInStars = Math.max(1, Math.round(totalCost)); // Do NOT multiply by 100 for XTR

    // 3️⃣ Create Stars invoice
    let invoiceLink;
    try {
      invoiceLink = await bot.api.createInvoiceLink(
        `${ticketType} Ticket - ${quantity}x`,
        `Event ticket purchase for ${userName}`,
        payload,
        "", // empty provider token for Stars
        "XTR", // Stars currency
        [
          {
            label: `${ticketType} Ticket`,
            amount: amountInStars,
          },
        ]
      );
    } catch (invErr: any) {
      console.error("❌ Telegram Stars invoice error:", invErr);
      return NextResponse.json({ success: false, message: "Telegram invoice creation failed" }, { status: 400 });
    }

    // 4️⃣ Create ticket in DB **after invoice succeeds**
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const ticket = await prisma.ticket.create({
      data: {
        ticketId,
        telegramId: BigInt(telegramId),
        userName,
        ticketType,
        quantity,
        paymentMethod: "stars",
        totalCost,
        pricePerTicket,
        status: "purchased",
      },
    });

    return NextResponse.json({ success: true, invoiceLink, ticketId, ticket });
  } catch (error: any) {
    console.error("🔥 Stars purchase final error:", error?.response?.data || error.message || error);
    return NextResponse.json(
      { success: false, message: error.message || "Invoice creation failed" },
      { status: 500 }
    );
  }
}
