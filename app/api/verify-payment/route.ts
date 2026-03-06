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
        // Find the buyer
        const buyer = await tx.user.findFirst({ where: { telegramId: BigInt(userId) } });
        if (!buyer) throw new Error("Buyer not found");

        // If paying with Shells, check and deduct balance
        if (paymentMethod === "SHELLS") {
          if (buyer.points < BigInt(totalAmount)) {
            throw new Error("Insufficient Shells balance");
          }
          await tx.user.update({
            where: { id: buyer.id },
            data: { points: { decrement: BigInt(totalAmount) } }
          });
        }

        // Update the Fighter: New Owner, Not for sale anymore
        const updatedFighter = await tx.fighter.update({
          where: { id: fighterId },
          data: {
            ownerId: buyer.id,
            isForSale: false,
            salePriceTon: null,
            salePriceShells: null,
            status: "APPROVED" // Or CONTRACTED if you updated your enum
          }
        });

        
// 1. Create the Order (The Receipt)
      const newOrder = await tx.order.create({
        data: {
          orderId: `PC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          paymentMethod: paymentMethod, // "TON" or "SHELLS"
          totalAmount: Number(totalAmount),
          status: "SUCCESS",
          transactionReference: transactionHash || `SHELL_${Date.now()}`,
        }
      });

      // 2. Create the Purchase (The link between User, Order, and Fighter)
      // Note: You may need to adjust field names based on your Purchase model
      await tx.purchase.create({
        data: {
          order: { connect: { id: newOrder.id } },
          user: { connect: { id: buyer.id } }, 
          paymentType: paymentMethod, // e.g., "TON"
          amountPaid: Number(totalAmount),
          // If your Purchase model tracks the fighter specifically:
          // fighterId: fighterId, 
          // quantity: 1,
        }
      });

        return { success: true, fighterName: updatedFighter.name };
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
