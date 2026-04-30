import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from '@/lib/auth';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateTelegramUser(req);
    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const telegramId = auth.telegramId;
    const body = await req.json();
    const { ticketType, quantity } = body;

    if (!ticketType || !quantity) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Fetch price from DB — never trust client
    const ticketConfig = await prisma.ticketType.findUnique({
      where: { name: ticketType }
    });

    if (!ticketConfig) {
      return NextResponse.json({ success: false, message: 'Invalid ticket type' }, { status: 400 });
    }

    const totalCost = Number(ticketConfig.priceStars) * quantity;
    const ticketId = `TKT${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const payload = JSON.stringify({
      type: "ticket_purchase",
      id: ticketId,
      tid: telegramId.toString(),
      qty: quantity,
      tt: ticketType,
    });

    if (payload.length > 128) {
      return NextResponse.json({ success: false, message: 'Internal error' }, { status: 400 });
    }

    const invoiceResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${ticketType} Ticket`,
          description: `${quantity}x ${ticketType} ticket(s)`,
          payload,
          currency: "XTR",
          prices: [{ label: `${ticketType} Ticket (${quantity}x)`, amount: Math.max(1, Math.round(totalCost)) }],
        }),
      }
    );

    const invoiceData = await invoiceResponse.json();

    if (!invoiceData.ok) {
      return NextResponse.json({ success: false, message: 'Failed to create invoice' }, { status: 400 });
    }

    return NextResponse.json({ success: true, invoiceLink: invoiceData.result, ticketId });

  } catch (error) {
    return NextResponse.json({ success: false, message: 'Invoice creation failed' }, { status: 500 });
  }
}