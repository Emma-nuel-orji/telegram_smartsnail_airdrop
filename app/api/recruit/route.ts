import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      fighterId, 
      telegramId, 
      paymentMethod, 
      transactionHash, 
      totalAmount,
      userId
    } = body;

    // 1. Validate Input
    if (!fighterId || !telegramId || !paymentMethod) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 2. Fetch Fighter & Buyer
      const fighter = await tx.fighter.findUnique({
        where: { id: fighterId },
        include: { owner: true } // Needed to check if it's a resale
      });

      const buyer = await tx.user.findUnique({
        where: { telegramId: BigInt(telegramId) }
      });

      if (!fighter) throw new Error("Fighter not found");
      if (!buyer) throw new Error("User not found. Please register first.");
      if (fighter.ownerId === buyer.id) throw new Error("You already own this fighter!");

      // 3. Payment Verification Logic
      if (paymentMethod === "SHELLS") {
        const cost = BigInt(Math.floor(Number(totalAmount)));
        if (buyer.points < cost) throw new Error("Insufficient Shells");

        // Deduct Shells
        await tx.user.update({
          where: { id: buyer.id },
          data: { points: { decrement: cost } }
        });
      } 
      else if (paymentMethod === "TON") {
        if (!transactionHash) throw new Error("TON transaction hash is required");
        // Note: In production, you'd call a TON indexer here to verify the BOC/Hash
      }

      // 4. Ownership Transfer
      const updatedFighter = await tx.fighter.update({
        where: { id: fighter.id },
        data: {
          ownerId: buyer.id,
          isForSale: false,
          salePriceTon: null,
          salePriceShells: null,
          status: "APPROVED" 
        }
      });

      // 5. Secondary Market Payout (If not a primary sale)
      const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID;
      if (fighter.ownerId && fighter.owner?.telegramId.toString() !== ADMIN_ID) {
        // If sold for TON, we credit the seller with Shells (1 TON = 1000 Shells)
        const payout = paymentMethod === "TON" 
          ? BigInt(Math.floor(Number(totalAmount) * 1000))
          : BigInt(Math.floor(Number(totalAmount)));

        await tx.user.update({
          where: { id: fighter.ownerId },
          data: { points: { increment: payout } }
        });
      }

      if (!fighter.ownerId) {
            await prisma.fighter.update({
              where: { id: fighterId },
              data: { ownerId: userId } // The ID sent from your frontend
            });
          } 
          // 3. Normal security check for non-genesis fighters
          else if (fighter.ownerId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
          }
     // 6. Create Records
            const newOrder = await tx.order.create({
            data: {
                orderId: `REC-${Date.now()}`,
                paymentMethod,
                totalAmount: Number(totalAmount),
                status: "SUCCESS",
                transactionReference: transactionHash || `INT-${Date.now()}`,
            }
            });

            await tx.purchase.create({
            data: {
                // ✅ Connect the order relation
                order: { connect: { id: newOrder.id } },
                // ✅ Connect the user relation (this fixes the TS error)
                user: { connect: { id: buyer.id } }, 
                paymentType: paymentMethod,
                amountPaid: Number(totalAmount),
            }
            });

      return { success: true, fighterName: updatedFighter.name };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Recruitment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}