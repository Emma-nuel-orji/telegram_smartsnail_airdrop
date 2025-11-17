import { NextResponse } from "next/server";
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
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate unique ticket ID for tracking
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 1️⃣ Prepare payload - include ALL ticket data
    const payload = JSON.stringify({
      ticketId,
      telegramId,
      userName,
      ticketType,
      quantity,
      totalCost,
      pricePerTicket,
      type: "ticket_purchase"
    });

    // 2️⃣ Calculate amount (integer ≥1)
    const amountInStars = Math.max(1, Math.round(totalCost));

    // 3️⃣ Create Stars invoice WITHOUT creating ticket in DB yet
    let invoiceLink;
    try {
      invoiceLink = await bot.api.createInvoiceLink(
        `${ticketType} Ticket - ${quantity}x`,
        `Event ticket purchase for ${userName}`,
        payload,
        "", // empty provider token for Stars
        "XTR",
        [
          {
            label: `${ticketType} Ticket`,
            amount: amountInStars,
          },
        ]
      );
      
      console.log("✅ Invoice created successfully:", invoiceLink);
      
    } catch (invErr: any) {
      console.error("❌ Telegram Stars invoice error:", invErr);
      return NextResponse.json(
        { success: false, message: "Telegram invoice creation failed" },
        { status: 400 }
      );
    }

    // 4️⃣ Return invoice link - ticket will be created AFTER payment via webhook
    return NextResponse.json({
      success: true,
      invoiceLink,
      ticketId, // Return for reference, but don't create in DB yet
    });
    
  } catch (error: any) {
    console.error("🔥 Stars purchase error:", error?.response?.data || error.message || error);
    return NextResponse.json(
      { success: false, message: error.message || "Invoice creation failed" },
      { status: 500 }
    );
  }
}