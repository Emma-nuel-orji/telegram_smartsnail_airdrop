import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 1. HELPER: Send Notification to Admin Group
async function sendTelegram(chatId: string | undefined, text: string, extra = {}) {
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return;
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', ...extra }),
    });
  } catch (err) {
    console.error("Telegram Notification Failed:", err);
  }
}

// 2. HELPER: Generate Stars Invoice Link
async function createStarInvoice(title: string, amount: number, payload: string) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/createInvoiceLink`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      description: `Enrollment for ${title}`,
      payload,
      provider_token: "", 
      currency: "XTR", 
      prices: [{ label: "Stars", amount: amount }] 
    })
  });
  const data = await res.json();
  return data.ok ? data.result : null;
}

export async function POST(req: Request) {
  try {
    const { telegramId, serviceId, planTitle, intensity, duration, currencyType, amount } = await req.json();

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { partner: { include: { admins: true } } }
    });
    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    // Define these UP HERE so Step C and Step D can both see them
    const d = duration.toLowerCase();
    const isShortTerm = d.includes("day") || d.includes("session") || d.includes("walk");

    if (currencyType === 'STARS') {
      const payload = JSON.stringify({
        type: "COMBAT_SUBSCRIPTION",
        telegramId,
        serviceId,
        planTitle,
        intensity,
        duration
      });
      const invoiceLink = await createStarInvoice(planTitle || service.name, amount, payload);
      if (!invoiceLink) return NextResponse.json({ success: false, error: "Invoice generation failed" });
      return NextResponse.json({ success: true, invoiceLink });
    }

    const subscription = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { telegramId: BigInt(telegramId) } });
      if (!user || Number(user.points) < amount) throw new Error("INSUFFICIENT_FUNDS");

      await tx.user.update({
        where: { telegramId: BigInt(telegramId) },
        data: { points: { decrement: amount } }
      });

      const startDate = new Date(); 
      const endDate = new Date();

      if (d.includes("year")) {
        endDate.setFullYear(startDate.getFullYear() + 1);
      } else if (d.includes("6 month")) {
        endDate.setMonth(startDate.getMonth() + 6);
      } else if (d.includes("3 month")) {
        endDate.setMonth(startDate.getMonth() + 3);
      } else if (d.includes("1 month")) {
        endDate.setMonth(startDate.getMonth() + 1);
      } else if (d.includes("week")) {
        endDate.setDate(startDate.getDate() + 7);
      } else {
        endDate.setDate(startDate.getDate() + 1);
      }

      return await tx.subscription.create({
        data: {
          user: { connect: { id: user.id } },
          service: { connect: { id: serviceId } },
          partner: { connect: { id: service.partnerId } },
          planTitle: planTitle || service.name,
          status: isShortTerm ? "ACTIVE" : "PENDING", 
          startDate: startDate, 
          endDate: endDate,     
          planType: !!intensity ? "COMBAT" : "GYM",
          gymName: service.partner.name
        },
        include: { user: true }
      });
    });

    // --- STEP D: Notification Logic ---
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
      `${isShortTerm 
          ? "✅ **Auto-activated** (Walk-in/1 Day)" 
          : "⚠️ **Action Required**: Plan is PENDING. Activate on arrival."}`;

    await sendTelegram(process.env.ADMIN_GROUP_ID, notificationMsg, {
      reply_markup: {
        inline_keyboard: isCombat ? [[{ 
          text: "📅 Set Training Days", 
          callback_data: `set_sched_${subscription.id}` 
        }]] : (isShortTerm ? [] : [[{
          text: "✅ Activate Membership",
          callback_data: `activate_sub_${subscription.id}`
        }]])
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Critical API Error:", error);
    if (error.message === "INSUFFICIENT_FUNDS") {
        return NextResponse.json({ success: false, error: "Insufficient Shells" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: "Internal Error" });
  }
}