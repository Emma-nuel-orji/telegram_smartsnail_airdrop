import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("🔍 VERIFY REQUEST RECEIVED:", body);

    const {
      paymentMethod,
      paymentReference,
      userId,
      totalAmount,
      bookId,
      bookCount,
      fxckedUpBagsQty = 0,
      humanRelationsQty = 0
    } = body;

    // 1. SILENTLY IGNORE STARS
    // The Telegram Webhook handles Stars updates. We return 200 to keep the UI stable.
    if (paymentMethod === "Stars") {
      return NextResponse.json({ 
        success: true, 
        message: "Stars payment detected; processing via Bot Webhook." 
      });
    }

    // 2. VALIDATE TON DATA
    if (paymentMethod === "TON") {
      if (!paymentReference || !userId) {
        return NextResponse.json(
          { error: "Missing TON payment reference or User ID" },
          { status: 400 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        // Find the user by Telegram ID
        const userTelegramId = BigInt(userId);
        const user = await tx.user.findUnique({
          where: { telegramId: userTelegramId },
        });

        if (!user) {
          throw new Error(`User with Telegram ID ${userId} not found.`);
        }

        // 3. HANDLE ORDER (Manual Upsert to avoid Unique constraint type error)
        let order = await tx.order.findFirst({
          where: { transactionReference: paymentReference },
        });

        if (order) {
          // Update existing order
          order = await tx.order.update({
            where: { id: order.id },
            data: { status: "SUCCESS" },
          });
        } else {
          // Create new order
          order = await tx.order.create({
            data: {
              orderId: `TON-${Date.now()}`,
              paymentMethod: "TON",
              totalAmount: Number(totalAmount || 0),
              status: "SUCCESS",
              transactionReference: paymentReference,
            },
          });
        }

        // 4. CREATE PURCHASE RECORD
        const purchase = await tx.purchase.create({
          data: {
            paymentType: "TON",
            amountPaid: Number(totalAmount || 0),
            booksBought: Number(bookCount || 0),
            fxckedUpBagsQty: Number(fxckedUpBagsQty),
            humanRelationsQty: Number(humanRelationsQty),
            // Link using relation shorthand
            userId: user.id, 
            orderId: order.id,
            bookId: bookId || undefined,
            createdAt: new Date(),
          },
        });

        return { 
          success: true, 
          orderId: order.orderId, 
          purchaseId: purchase.id 
        };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: `Unsupported payment method: ${paymentMethod}` },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("❌ VERIFY ERROR:", error.message);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}