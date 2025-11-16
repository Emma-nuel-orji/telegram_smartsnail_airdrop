import { NextResponse } from "next/server";
import { prisma } from "@/prisma/client";
import { Bot } from "grammy";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing from .env");
}

const bot = new Bot(TELEGRAM_BOT_TOKEN);

export async function POST(req: Request) {
  console.log("📩 /api/tickets/present called");

  try {
    const body = await req.json();
    console.log("📦 Request body:", body);

    const { telegramId, userName, ticketType, quantity, totalCost, pricePerTicket } = body;

    if (!telegramId || !ticketType || !quantity || !totalCost) {
      console.log("❌ Missing required fields");
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log("🆔 Generated ticketId:", ticketId);

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

    console.log("💾 Ticket saved to DB:", ticket);

    const payload = JSON.stringify({ ticketId, telegramId, type: "ticket_purchase" });
    console.log("📨 Payload for invoice:", payload);

    const amountInStars = Math.max(1, Math.round(totalCost * 100));
    console.log("⭐ Amount in stars:", amountInStars);

    let invoiceLink;
    try {
      invoiceLink = await bot.api.createInvoiceLink(
        `${ticketType} Ticket - ${quantity}x`,
        `Event ticket purchase for ${userName}`,
        payload,
        "", // required for Stars payments
        "XTR", // Stars currency
        [{ label: `${ticketType} Ticket`, amount: amountInStars }]
      );
    } catch (invErr: any) {
      console.error("❌ Telegram Stars invoice error:", invErr);
      throw new Error("Telegram invoice creation failed");
    }

    console.log("✔️ Invoice link created:", invoiceLink);

    return NextResponse.json({ success: true, invoiceLink, ticketId });
  } catch (error: any) {
    console.error("🔥 FINAL CATCH ERROR:", error?.response?.data || error.message || error);
    return NextResponse.json(
      { success: false, message: error.message || "Invoice creation failed" },
      { status: 500 }
    );
  }
}
