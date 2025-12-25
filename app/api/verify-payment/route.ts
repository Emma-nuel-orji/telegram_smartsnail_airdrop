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
