import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1. ADD THE HELPER (Fixes: Cannot find name 'sendTelegram')
async function sendTelegram(chatId: string | undefined, text: string, extra = {}) {
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return;
  
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        ...extra,
      }),
    });
  } catch (err) {
    console.error("Telegram Notification Failed:", err);
  }
}

export async function POST(req: Request) {
  try {
    const { telegramId, serviceId, planTitle, intensity, duration } = await req.json();

    // 2. Fetch Partner/Admin Context
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { 
        partner: { include: { admins: true } } 
      }
    });

    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    // 3. Subscription Setup
    const startDate = new Date();
    const endDate = new Date();
    if (duration === '3 Months') endDate.setMonth(startDate.getMonth() + 3);
    else endDate.setMonth(startDate.getMonth() + 1);

    // 4. THE PRISMA FIX: Include the 'user' relation in the return object
   const subscription = await prisma.subscription.create({
  data: {
    user: { connect: { telegramId: BigInt(telegramId) } },
    service: { connect: { id: serviceId } },
    // FIX: Use 'connect' instead of passing the string directly
    partner: { connect: { id: service.partnerId } }, 
    planTitle: planTitle || service.name,
    status: "ACTIVE",
    startDate,
    endDate,
    planType: !!intensity ? "COMBAT" : "GYM",
    gymName: service.partner.name
  },
  include: { 
    user: true 
  }
});

    // 5. Notification Logic
    const partnerAdmin = service.partner.admins[0];
    const adminTag = partnerAdmin 
      ? `[Admin](tg://user?id=${partnerAdmin.telegramId.toString()})` 
      : "@SuperAdmin";

    const isCombat = !!intensity;
    const header = isCombat ? "🥊 **COMBAT ENROLLMENT**" : "🏋️ **GYM ACCESS GRANTED**";
    
    const notificationMsg = 
      `${adminTag} \n` + 
      `${header}\n\n` +
      `📍 **Location:** ${service.partner.name}\n` +
      `👤 **Trainee:** ${subscription.user.firstName}\n` +
      `📋 **Plan:** ${planTitle}\n` +
      `${isCombat ? "⚠️ *Action Required: Set training days.*" : "✅ *Auto-activated.*"}`;

    await sendTelegram(process.env.ADMIN_GROUP_ID, notificationMsg, {
      reply_markup: { // Note: 'reply_markup' is the correct key for inline_keyboard in Bot API
        inline_keyboard: isCombat ? [[{ 
          text: "📅 Set Training Days", 
          callback_data: `set_sched_${subscription.id}` 
        }]] : []
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Critical API Error:", error);
    return NextResponse.json({ success: false, error: "Internal Error" });
  }
}