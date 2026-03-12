import { NextRequest, NextResponse } from "next/server";
import { Bot } from "grammy";
import { prisma } from '@/prisma/client';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is not set");
}

const bot = new Bot(TELEGRAM_BOT_TOKEN as string);

// Replace with your actual book IDs from database
const FUB_BOOK_ID = "fxcked-up-bags-id";
const HR_BOOK_ID = "human-relations-id";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      title,
      description,
      amount,
      label,
      bookCount,
      fxckedUpBagsQty = 0,
      humanRelationsQty = 0,
      telegramId,
      referrerId,
      tappingRate,
      totalPoints,
    } = body;

    // Validate inputs
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    if (!bookCount || bookCount < 1 || !amount || amount < 0) {
      return NextResponse.json({ error: "Invalid purchase details" }, { status: 400 });
    }

    // Process in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update FxckedUpBags stock
      if (fxckedUpBagsQty > 0) {
        const availableCodes = await tx.generatedCode.findMany({
          where: { 
            bookId: FUB_BOOK_ID,
            isUsed: false 
          },
          take: fxckedUpBagsQty,
          select: { id: true }
        });

        if (availableCodes.length < fxckedUpBagsQty) {
          throw new Error("Not enough Fxcked Up Bags in stock");
        }

        await tx.generatedCode.updateMany({
          where: { 
            id: { in: availableCodes.map(code => code.id) }
          },
          data: { isUsed: true }
        });
      }

      // Update HumanRelations stock
      if (humanRelationsQty > 0) {
        const availableCodes = await tx.generatedCode.findMany({
          where: { 
            bookId: HR_BOOK_ID,
            isUsed: false 
          },
          take: humanRelationsQty,
          select: { id: true }
        });

        if (availableCodes.length < humanRelationsQty) {
          throw new Error("Not enough Human Relations in stock");
        }

        await tx.generatedCode.updateMany({
          where: { 
            id: { in: availableCodes.map(code => code.id) }
          },
          data: { isUsed: true }
        });
      }

      // Create transaction record
      const order = await tx.order.findFirst({
        where: { status: "PENDING" }, 
      });

      if (!order) {
        throw new Error("Valid order not found");
      }

      return await tx.pendingTransaction.create({
        data: {
          email,
          amount: Number(amount),
          bookCount,
          fxckedUpBagsQty,
          humanRelationsQty,
          telegramId,
          referrerId: referrerId || null,
          tappingRate: Number(tappingRate) || 0,
          totalPoints: Number(totalPoints) || 0,
          payloadData: JSON.stringify(body),
          status: "PENDING",
          orderId: order.id,
        },
      });
    });

    // Generate invoice link
    const invoiceLink = await bot.api.createInvoiceLink(
      title || "Book Payment",
      description || "Payment for books via Telegram Stars",
      JSON.stringify({ email, bookCount, telegramId }),
      "", // Provider token (empty for Stars)
      "XTR", // Currency
      [{ 
        label: label || "Book Payment",
        amount: Math.max(1, Math.round(Number(amount)))
      }]
    );

    return NextResponse.json({ 
      invoiceLink,
      stockUpdated: true
    });

  } catch (error: any) {
    console.error("Payment processing error:", error);
    return NextResponse.json(
      { error: error.message || "Payment processing failed" },
      { status: 500 }
    );
  }
}