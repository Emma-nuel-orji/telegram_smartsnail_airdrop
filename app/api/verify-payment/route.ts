// app/api/verify-payment/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processPayment } from '../purchase/route';

export async function POST(request: Request) {
  try {
    
    const body = await request.json();
    const {
      orderId,
      transactionHash,
      paymentMethod,
      totalAmount,
      userId,
      bookCount,
      bookId,
      fighterId, itemType,
      fxckedUpBagsQty,
      humanRelationsQty,
      telegram_payment_charge_id, // For Stars payments
      payment_id, // Alternative identifier for Stars
    } = body;

    console.log('🔍 Payment verification request received:', {
      orderId,
      transactionHash,
      paymentMethod,
      telegram_payment_charge_id,
    });


    // 1. Handle Fighter Recruitment/Resale
    if (itemType === "FIGHTER_RECRUITMENT" || itemType === "FIGHTER_RESALE") {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Fetch Fighter
 // 1. Fetch Fighter
const fighter = await tx.fighter.findUnique({
  where: { id: fighterId },
  select: { id: true, name: true, ownerId: true, salePriceTon: true, salePriceShells: true }
});

if (!fighter) throw new Error("Fighter not found");

// 2. SECURITY CHECK: Verify the price matches the DB
if (paymentMethod === "SHELLS") {
    const actualPrice = Number(fighter.salePriceShells || 0);
    // Use a small margin for floats if necessary, but for Shells/Points, exact is usually best
    if (Number(totalAmount) < actualPrice) {
        throw new Error(`Price mismatch: Expected ${actualPrice} Shells, got ${totalAmount}`);
    }
} 

if (paymentMethod === "TON") {
    const actualPriceTon = Number(fighter.salePriceTon || 0);
    // We check if the reported totalAmount is at least what the DB requires
    if (Number(totalAmount) < actualPriceTon) {
        throw new Error(`Price mismatch: Expected ${actualPriceTon} TON, got ${totalAmount}`);
    }
}

    // Replace with your actual numerical Telegram ID
    const PRIMARY_SELLER_ID = "654321000"; 

    // 2. Find Buyer (Using findFirst to be safe with telegramId)
    // We convert to BigInt only for the telegramId field
    const buyer = await tx.user.findFirst({ 
      where: { telegramId: BigInt(userId) } 
    });
    
    if (!buyer) throw new Error("Buyer not found in database");

    // 3. Payment Deduction (Shells only)
    if (paymentMethod === "SHELLS") {
      const amountToDeduct = BigInt(totalAmount);
      if (buyer.points < amountToDeduct) throw new Error("Insufficient Shells");
      
      await tx.user.update({
        where: { id: buyer.id },
        data: { points: { decrement: amountToDeduct } }
      });
    }

    // 4. Update Fighter Ownership
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

    // 5. Handle Secondary Payout (The Manager's cut)
    if (fighter.ownerId && fighter.ownerId !== PRIMARY_SELLER_ID) {
      const seller = await tx.user.findUnique({ where: { id: fighter.ownerId } });
      
      if (seller) {
        // Calculate payout (1 TON = 1000 Shells)
        const payoutShells = BigInt(Math.floor(Number(fighter.salePriceTon || 0) * 1000));
        
        await tx.user.update({
          where: { id: seller.id },
          data: { points: { increment: payoutShells } }
        });

        await tx.pointTransaction.create({
          data: {
            userId: seller.id,
            pointsUsed: payoutShells,
            type: 'EARN', 
            status: 'APPROVED',
            // serviceId is now optional, so it stays null here
          }
        });
      }
    }

    // 6. Create Receipt Records
    const newOrder = await tx.order.create({
      data: {
        orderId: `PC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        paymentMethod: paymentMethod,
        totalAmount: Number(totalAmount),
        status: "SUCCESS",
        transactionReference: transactionHash || `SHELL_${Date.now()}`,
      }
    });

    await tx.purchase.create({
      data: {
        order: { connect: { id: newOrder.id } }, 
        user: { connect: { id: buyer.id } },
        paymentType: paymentMethod,
        amountPaid: Number(totalAmount),
      }
    });

    return { success: true, fighterName: updatedFighter.name, orderId: newOrder.orderId };
  });

  return NextResponse.json(result);
}



    // ✅ Validate required fields based on payment method
    if (paymentMethod === 'TON' && !transactionHash) {
      return NextResponse.json(
        { success: false, error: 'Missing transaction hash for TON payment' },
        { status: 400 }
      );
    }
    if (paymentMethod === 'Stars' && !telegram_payment_charge_id && !payment_id) {
      return NextResponse.json(
        { success: false, error: 'Missing payment identifier for Stars payment' },
        { status: 400 }
      );
    }
    if (!['TON', 'Stars'].includes(paymentMethod) && (!orderId || !transactionHash)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let existingOrder = null;

      if (orderId) {
        existingOrder = await tx.order.findUnique({ where: { orderId } });
      } else if (transactionHash && paymentMethod === 'TON') {
        existingOrder = await tx.order.findFirst({ where: { transactionReference: transactionHash } });
      }

      // ✅ Handle Stars payment verification
      if (paymentMethod === 'Stars') {
        const pendingTransaction = await tx.pendingTransaction.findFirst({
          where: {
            OR: [
              { payloadData: { contains: telegram_payment_charge_id || '' } },
              { id: payment_id },
            ],
            status: 'PENDING',
          },
          include: { order: true },
        });

        if (pendingTransaction?.status === 'COMPLETED') {
          return {
            success: true,
            message: 'Payment already processed',
            orderId: pendingTransaction.order?.orderId,
          };
        }

        if (pendingTransaction?.order) {
          await tx.pendingTransaction.update({
            where: { id: pendingTransaction.id },
            data: { status: 'COMPLETED' },
          });

          await tx.order.update({
            where: { id: pendingTransaction.order.id },
            data: {
              status: 'SUCCESS',
              transactionReference: telegram_payment_charge_id || payment_id,
            },
          });

          return {
            success: true,
            message: 'Stars payment verified successfully',
            orderId: pendingTransaction.order.orderId,
          };
        }

        return { success: false, error: 'Could not find a pending Stars payment transaction' };
      }

      // ✅ Prevent duplicate processing
      if (existingOrder?.status === 'SUCCESS') {
        return {
          success: true,
          message: 'Payment already processed',
          orderId: existingOrder.orderId,
        };
      }

      // ✅ Process non-Stars payments using `processPayment`
      if (paymentMethod !== 'Stars') {
        const paymentResult = await processPayment(
          tx,
          paymentMethod,
          transactionHash,
          totalAmount,
          userId,
          bookCount,
          bookId,
          fxckedUpBagsQty,
          humanRelationsQty
        );

        return {
          success: true,
          message: 'Payment verified successfully',
          orderId: paymentResult.orderId,
        };
      }
    });

    if (!result || !result.success) {
      return NextResponse.json(result ?? { error: "Undefined result" }, { status: 400 });
    }
    

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Payment verification failed' },
      { status: 400 }
    );
  }
}
