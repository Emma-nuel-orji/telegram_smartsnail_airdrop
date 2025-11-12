import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("🟢 Incoming body:", body);

    const { ticketId, telegramId, userName, ticketType, quantity, paymentMethod, purchaseDate } = body;

    if (!ticketId || !telegramId) {
      console.log("❌ Missing ticketId or telegramId");
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    console.log("🔍 Looking for ticket:", ticketId, telegramId);

    const ticket = await prisma.ticket.findFirst({
      where: { ticketId, telegramId: BigInt(telegramId.toString()) },
    });

    console.log("🧾 Found ticket:", ticket);

    if (!ticket) {
      console.log("❌ Ticket not found");
      return NextResponse.json({ success: false, message: 'Ticket not found' }, { status: 404 });
    }

    await prisma.ticket.update({
      where: { ticketId },
      data: { status: 'pending' },
    });
    console.log("✏️ Ticket marked as pending");

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    // const BOT_TOKEN = process.env.BOT_TOKEN;
    const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;

    console.log("🔑 Bot token exists:", !!TELEGRAM_BOT_TOKEN, "Group ID exists:", !!ADMIN_GROUP_ID);

    if (!TELEGRAM_BOT_TOKEN || !ADMIN_GROUP_ID) {
      return NextResponse.json({ success: false, message: 'Bot configuration missing' }, { status: 500 });
    }

    const message = `
🎟️ *NEW TICKET VERIFICATION REQUEST*

👤 *User:* ${userName}
🆔 *Telegram ID:* \`${telegramId}\`
🎫 *Ticket Type:* ${ticketType}
🔢 *Quantity:* ${quantity}
💳 *Payment:* ${paymentMethod.toUpperCase()}
💰 *Total Cost:* ${(ticket.totalCost ?? 0).toLocaleString()}
📅 *Purchase Date:* ${new Date(purchaseDate).toLocaleString()}

🆔 *Ticket ID:* \`${ticketId}\`
    `;

    console.log("📨 Sending Telegram message...");

    const response = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: ADMIN_GROUP_ID,
      text: message,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve', callback_data: `approve_ticket_${ticketId}` },
            { text: '❌ Reject', callback_data: `reject_ticket_${ticketId}` },
          ],
        ],
      },
    });

    console.log("✅ Telegram message sent:", response.data);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Present ticket error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
