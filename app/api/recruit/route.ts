import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    /* =========================
       1. AUTH
    ========================= */
    const auth = await authenticateTelegramUser(request);

    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const telegramId = auth.telegramId;

    /* =========================
       2. INPUT — only accept fighterId
       telegramId comes from verified token above
       paymentMethod defaults to SHELLS for now
    ========================= */
    const body = await request.json();
    const { fighterId, paymentMethod = "SHELLS", transactionHash, totalAmount } = body;

    if (!fighterId) {
      return NextResponse.json({ error: "Missing fighterId" }, { status: 400 });
    }

    /* =========================
       3. TRANSACTION
    ========================= */
    const result = await prisma.$transaction(async (tx) => {
      // Fetch fighter and buyer using VERIFIED telegramId
      const fighter = await tx.fighter.findUnique({
        where: { id: fighterId },
        include: { owner: true }
      });

      const buyer = await tx.user.findUnique({
        where: { telegramId } // ← from token, not body
      });

      if (!fighter) throw new Error("Fighter not found");
      if (!buyer) throw new Error("User not found. Please register first.");
      if (fighter.ownerId === buyer.id) throw new Error("You already own this fighter!");

      /* =========================
         4. PAYMENT
      ========================= */
      if (paymentMethod === "SHELLS") {
        const cost = BigInt(Math.floor(Number(totalAmount)));
        if (buyer.points < cost) throw new Error("Insufficient Shells");

        await tx.user.update({
          where: { id: buyer.id },
          data: { points: { decrement: cost } }
        });
      } else if (paymentMethod === "TON") {
        if (!transactionHash) throw new Error("TON transaction hash is required");
        // TODO: verify TON transaction hash against blockchain
      }

      /* =========================
         5. OWNERSHIP TRANSFER
      ========================= */
      const updatedFighter = await tx.fighter.update({
        where: { id: fighter.id },
        data: {
          ownerId: buyer.id, // ← use buyer.id from DB, not client
          isForSale: false,
          salePriceTon: null,
          salePriceShells: null,
          status: "APPROVED"
        }
      });

      /* =========================
         6. SECONDARY MARKET PAYOUT
      ========================= */
      const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;
      if (fighter.ownerId && fighter.owner?.telegramId.toString() !== ADMIN_ID) {
        const payout = paymentMethod === "TON"
          ? BigInt(Math.floor(Number(totalAmount) * 1000))
          : BigInt(Math.floor(Number(totalAmount)));

        await tx.user.update({
          where: { id: fighter.ownerId },
          data: { points: { increment: payout } }
        });
      }

      /* =========================
         7. CREATE ORDER RECORD
      ========================= */
      const newOrder = await tx.order.create({
        data: {
          orderId: `REC-${Date.now()}`,
          paymentMethod,
          totalAmount: Number(totalAmount) || 0,
          status: "SUCCESS",
          transactionReference: transactionHash || `INT-${Date.now()}`,
        }
      });

      await tx.purchase.create({
        data: {
          order: { connect: { id: newOrder.id } },
          user: { connect: { id: buyer.id } },
          paymentType: paymentMethod,
          amountPaid: Number(totalAmount) || 0,
        }
      });

      return { success: true, fighterName: updatedFighter.name };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    /* =========================
       8. SAFE ERROR RESPONSE
       Don't expose internal errors
    ========================= */
    console.error("Recruitment Error:", error);

    const knownErrors = [
      "Fighter not found",
      "User not found. Please register first.",
      "You already own this fighter!",
      "Insufficient Shells",
      "TON transaction hash is required",
    ];

    const safeMessage = knownErrors.includes(error.message)
      ? error.message
      : "Recruitment failed. Please try again.";

    return NextResponse.json({ error: safeMessage }, { status: 400 });
  }
}