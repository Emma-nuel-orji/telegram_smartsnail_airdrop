import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Bot } from "grammy";
import { authenticateTelegramUser } from "@/lib/auth";

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

export async function POST(request: NextRequest) {
  try {
    // 🔐 AUTH (STANDARDIZED)
    const auth = await authenticateTelegramUser(request);

    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }


    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const telegramId = auth.telegramId.toString();

    const body = await request.json();

    const {
      email,
      amount,
      bookCount,
      fxckedUpBagsQty = 0,
      humanRelationsQty = 0,
    } = body;

    // ✅ VALIDATION
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (!bookCount || !amount) {
      return NextResponse.json({ error: "Invalid purchase" }, { status: 400 });
    }

    // ✅ CREATE PENDING TRANSACTION (NO STOCK TOUCH)
    const pending = await prisma.pendingTransaction.create({
      data: {
        email,
        amount: Number(amount),
        bookCount: Number(bookCount),
        fxckedUpBagsQty: Number(fxckedUpBagsQty),
        humanRelationsQty: Number(humanRelationsQty),
        telegramId,
        payloadData: "",
        status: "PENDING",
      },
    }); 

    // ✅ SAFE PAYLOAD (MINIMAL)
    const payload = JSON.stringify({
      t: pending.id,
    });

    // Save payload
    await prisma.pendingTransaction.update({
      where: { id: pending.id },
      data: { payloadData: payload },
    });

    // ✅ CREATE TELEGRAM INVOICE
    const invoiceLink = await bot.api.createInvoiceLink(
      "Book Purchase",
      "Payment via Telegram Stars",
      payload,
      "",
      "XTR",
      [
        {
          label: "Books",
          amount: Math.max(1, Math.round(Number(amount))),
        },
      ]
    );

    return NextResponse.json({ invoiceLink });

  } catch (error: any) {
    console.error("PaymentByStars Error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}