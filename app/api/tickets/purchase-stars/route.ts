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
    const { telegramId, userName, ticketType, quantity, totalCost, pricePerTicket } = await req.json();

    if (!telegramId || !ticketType || !quantity || !totalCost) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

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

    const payload = JSON.stringify({ ticketId, telegramId, type: "ticket_purchase" });

    const invoiceLink = await bot.api.createInvoiceLink(
      `${ticketType} Ticket - ${quantity}x`,
      `Event ticket purchase for ${userName}`,
      payload,
      "", // provider token must be empty for Stars
      "XTR",
      [{ label: `${ticketType} Ticket`, amount: Math.max(1, Math.round(totalCost * 100)) }]
    );

    return NextResponse.json({ success: true, invoiceLink, ticketId });
  } catch (error: any) {
    console.error("Stars purchase error:", error.response?.data || error.message || error);
    return NextResponse.json({ success: false, message: error.message || "Invoice creation failed" }, { status: 500 });
  }
}
