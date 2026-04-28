import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelegramUser } from "@/lib/auth";

/* =========================
   TELEGRAM NOTIFICATION
========================= */
async function sendTelegram(chatId: string | undefined, text: string) {
  if (!chatId || !process.env.TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
      }
    );
  } catch (err) {
    // Silent fail — notification failure shouldn't break the purchase
  }
}

/* =========================
   STARS INVOICE
========================= */
async function createStarInvoice(title: string, amount: number, payload: string) {
  const res = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: `Enrollment for ${title}`,
        payload,
        provider_token: "",
        currency: "XTR",
        prices: [{ label: "Stars", amount }],
      }),
    }
  );
  const data = await res.json();
  return data.ok ? data.result : null;
}

/* =========================
   MAIN ROUTE
========================= */
export async function POST(req: NextRequest) {
  try {
    /* =========================
       1. AUTH
    ========================= */
    const auth = await authenticateTelegramUser(req);

    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const telegramId = auth.telegramId;
    const isSuperAdmin = auth.isAdmin === true;

    /* =========================
       2. INPUT
    ========================= */
    const { serviceId, planTitle, intensity, duration, currencyType } =
      await req.json();

    /* =========================
       3. FETCH SERVICE FROM DB
          Never trust client price
    ========================= */
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { partner: { include: { admins: true } } },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Price always comes from DB, never from client
    const price =
      currencyType === "SHELLS"
        ? Number(service.priceShells)
        : Number(service.priceStars);

    const d = (duration || "").toLowerCase();
    const isShortTerm =
      d.includes("day") || d.includes("session") || d.includes("walk");

    /* =========================
       4. STARS FLOW
    ========================= */
    if (currencyType === "STARS") {
      const payload = JSON.stringify({
        type: "COMBAT_SUBSCRIPTION",
        telegramId,
        serviceId,
        planTitle,
        intensity,
        duration,
      });

      const invoiceLink = await createStarInvoice(
        planTitle || service.name,
        price,
        payload
      );

      if (!invoiceLink) {
        return NextResponse.json(
          { success: false, error: "Invoice generation failed" },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, invoiceLink });
    }

    /* =========================
       5. SHELLS FLOW
    ========================= */
    const subscription = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegramId },
      });

      if (!user) throw new Error("INSUFFICIENT_FUNDS");

      // Superadmin gets free access — skip balance check and deduction
      if (!isSuperAdmin) {
        if (Number(user.points) < price) {
          throw new Error("INSUFFICIENT_FUNDS");
        }

        await tx.user.update({
          where: { telegramId },
          data: {
            points: { decrement: price },
          },
        });
      }

      const startDate = new Date();
      const endDate = new Date();

      if (d.includes("year")) endDate.setFullYear(startDate.getFullYear() + 1);
      else if (d.includes("6 month")) endDate.setMonth(startDate.getMonth() + 6);
      else if (d.includes("3 month")) endDate.setMonth(startDate.getMonth() + 3);
      else if (d.includes("1 month")) endDate.setMonth(startDate.getMonth() + 1);
      else if (d.includes("week")) endDate.setDate(startDate.getDate() + 7);
      else endDate.setDate(startDate.getDate() + 1);

      return tx.subscription.create({
        data: {
          user: { connect: { id: user.id } },
          service: { connect: { id: serviceId } },
          partner: { connect: { id: service.partnerId } },
          planTitle: planTitle || service.name,
          status: isShortTerm ? "ACTIVE" : "PENDING",
          startDate,
          endDate,
          planType: intensity ? "COMBAT" : "GYM",
          gymName: service.partner.name,
        },
        include: { user: true },
      });
    });

    /* =========================
       6. NOTIFICATION
    ========================= */
    const partnerAdmin = service.partner.admins[0];
    const adminTag = partnerAdmin
      ? `[Admin](tg://user?id=${partnerAdmin.telegramId.toString()})`
      : "@SuperAdmin";

    const msg =
      `${adminTag}\n` +
      `${intensity ? "🥊 COMBAT ENROLLMENT" : "🏋️ GYM ACCESS GRANTED"}\n\n` +
      `📍 Location: ${service.partner.name}\n` +
      `👤 Trainee: ${subscription.user.firstName}\n` +
      `📋 Plan: ${planTitle}\n` +
      `${isSuperAdmin ? "🔑 SuperAdmin (no charge)" : ""}\n` +
      `${isShortTerm ? "✅ Auto-activated" : "⚠️ Pending activation"}`;

    await sendTelegram(process.env.ADMIN_GROUP_ID, msg);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    if (error.message === "INSUFFICIENT_FUNDS") {
      return NextResponse.json(
        { success: false, error: "Insufficient Shells" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal Error" },
      { status: 500 }
    );
  }
}