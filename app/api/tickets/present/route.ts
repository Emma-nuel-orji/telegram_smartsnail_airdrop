import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("🟢 Incoming request body:", body);

    const { ticketId, telegramId, userName, ticketType, quantity, paymentMethod, purchaseDate } = body;

    // 🔹 Validate required fields
    if (!ticketId || !telegramId) {
      console.log("❌ Missing ticketId or telegramId");
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log("🔍 Searching for ticket with:", { ticketId, telegramId });

    // 🔹 Find ticket in DB
    const ticket = await prisma.ticket.findFirst({
      where: {
        ticketId,
        telegramId: BigInt(telegramId.toString())
      },
    });

    console.log("🧾 Ticket found:", ticket);

    if (!ticket) {
      console.log("❌ Ticket not found in database");
      return NextResponse.json(
        { success: false, message: 'Ticket not found' },
        { status: 404 }
      );
    }

    // 🔹 Update status to pending
    await prisma.ticket.update({
      where: { ticketId },
      data: { status: 'pending' },
    });
    console.log("✏️ Ticket status updated to 'pending'");

    // 🔹 Load environment variables
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID;

    console.log("🔑 Bot token loaded:", !!TELEGRAM_BOT_TOKEN);
    console.log("🏷️ Admin group ID loaded:", ADMIN_GROUP_ID);

    if (!TELEGRAM_BOT_TOKEN || !ADMIN_GROUP_ID) {
      console.log("❌ Missing bot token or group ID in environment variables");
      return NextResponse.json(
        { success: false, message: 'Bot configuration missing' },
        { status: 500 }
      );
    }

    // 🔹 Prepare Telegram message
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

    console.log("📨 Sending Telegram message to group...");

    // 🔹 Send message via Telegram API
    const telegramResponse = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: ADMIN_GROUP_ID,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: `approve_ticket_${ticketId}` },
              // { text: '❌ Reject', callback_data: `reject_ticket_${ticketId}` },
            ],
          ],
        },
      }
    );

    console.log("✅ Telegram message sent successfully:", telegramResponse.data);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("🚨 Present ticket error:", error.response?.data || error.message || error);
    return NextResponse.json(
      { success: false, message: error.message || 'Unknown server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
    console.log("🔒 Prisma client disconnected");
  }
}
