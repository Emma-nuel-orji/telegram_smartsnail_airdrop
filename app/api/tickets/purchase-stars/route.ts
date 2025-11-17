// app/api/tickets/purchase-stars/route.ts
import { NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is missing from .env");
}

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

    // Generate unique ticket ID
    const ticketId = `TKT${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // ⚠️ IMPORTANT: Keep payload under 128 bytes
    const payload = JSON.stringify({
      type: "ticket_purchase",
      id: ticketId,
      tid: telegramId,
      qty: quantity,
      tt: ticketType,
      cost: totalCost,
      ppt: pricePerTicket
    });

    console.log("📦 Payload:", payload);
    console.log("📏 Payload length:", payload.length, "bytes");

    if (payload.length > 128) {
      console.error("❌ Payload too long:", payload.length);
      return NextResponse.json(
        { success: false, message: "Payload exceeds Telegram limit" },
        { status: 400 }
      );
    }

    // Calculate amount (must be positive integer)
    const amountInStars = Math.max(1, Math.round(totalCost));

    // Create invoice using direct Telegram Bot API
    const invoiceResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${ticketType} Ticket`,
          description: `${quantity}x ${ticketType} ticket(s) for ${userName || 'User'}`,
          payload: payload,
          currency: "XTR", // Telegram Stars
          prices: [
            {
              label: `${ticketType} Ticket (${quantity}x)`,
              amount: amountInStars,
            },
          ],
        }),
      }
    );

    const invoiceData = await invoiceResponse.json();

    if (!invoiceResponse.ok || !invoiceData.ok) {
      console.error("❌ Telegram API Error:", invoiceData);
      return NextResponse.json(
        { 
          success: false, 
          message: invoiceData.description || "Failed to create invoice",
          error: invoiceData 
        },
        { status: 400 }
      );
    }

    const invoiceLink = invoiceData.result;
    console.log("✅ Invoice created:", invoiceLink);

    return NextResponse.json({
      success: true,
      invoiceLink,
      ticketId,
    });

  } catch (error: any) {
    console.error("🔥 Invoice creation error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Invoice creation failed",
        details: error.toString()
      },
      { status: 500 }
    );
  }
}