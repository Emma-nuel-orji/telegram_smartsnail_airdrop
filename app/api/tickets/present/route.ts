import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateTelegramUser(req);
    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const telegramId = auth.telegramId;
    const body = await req.json();
    const { ticketId, ticketType, quantity, paymentMethod, purchaseDate } = body;

    if (!ticketId) {
      return NextResponse.json({ success: false, message: 'Missing ticketId' }, { status: 400 });
    }

    // Verify ticket belongs to this user
    const ticket = await prisma.ticket.findFirst({
      where: { ticketId, telegramId }
    });

    if (!ticket) {
      return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 });
    }

    await prisma.ticket.update({
      where: { ticketId },
      data: { status: 'pending' },
    });

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;

    if (!TELEGRAM_BOT_TOKEN || !ADMIN_GROUP_ID) {
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    const message = `
🎟️ *NEW TICKET VERIFICATION REQUEST*
🎫 *Ticket Type:* ${ticketType}
🔢 *Quantity:* ${quantity}
💳 *Payment:* ${paymentMethod?.toUpperCase()}
💰 *Total Cost:* ${(ticket.totalCost ?? 0).toLocaleString()}
🆔 *Ticket ID:* \`${ticketId}\`
    `;

    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_GROUP_ID,
          text: message,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Approve', callback_data: `approve_ticket_${ticketId}` }
            ]]
          }
        })
      }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to present ticket' }, { status: 500 });
  }
}