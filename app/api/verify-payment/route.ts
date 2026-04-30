import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Clean Verify Route
 * Handles TON payments from the frontend.
 * Stars payments are ignored here because they are handled by the Bot Webhook.
 */
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
    // If the frontend calls this for Stars, we return 200 so the UI doesn't crash,
    // but we let the Telegram Webhook handle the database updates.
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

      // 3. PROCESS TON TRANSACTION
      const result = await prisma.$transaction(async (tx) => {
        // Convert userId (Telegram ID) to BigInt carefully
        const userTelegramId = BigInt(userId);

        const user = await tx.user.findUnique({
          where: { telegramId: userTelegramId },
        });

        if (!user) {
          throw new Error(`User with Telegram ID ${userId} not found.`);
        }

        // Create or Update the Order to SUCCESS
        const order = await tx.order.upsert({
          where: { transactionReference: paymentReference },
          update: { status: "SUCCESS" },
          create: {
            orderId: `TON-${Date.now()}`,
            paymentMethod: "TON",
            totalAmount: Number(totalAmount),
            status: "SUCCESS",
            transactionReference: paymentReference,
          },
        });

        // Create the Purchase Record
        const purchase = await tx.purchase.create({
          data: {
            paymentType: "TON",
            amountPaid: Number(totalAmount),
            booksBought: Number(bookCount || 0),
            fxckedUpBagsQty: Number(fxckedUpBagsQty),
            humanRelationsQty: Number(humanRelationsQty),
            userId: user.id, // Internal MongoDB ID
            orderId: order.id,
            bookId: bookId || undefined,
            createdAt: new Date(),
          },
        });

        // Note: The actual "Boost" logic (updating tappingRate/boostExpiresAt) 
        // should be triggered here if not handled by a global listener.
        
        return { 
          success: true, 
          orderId: order.orderId, 
          purchaseId: purchase.id 
        };
      });

      return NextResponse.json(result);
    }

    // 4. FALLBACK FOR UNKNOWN METHODS
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