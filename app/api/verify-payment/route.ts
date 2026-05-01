import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processPayment, updateDatabaseTransaction } from '../purchase/route';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const {
      paymentMethod,
      userId,
      totalAmount,
      bookCount,
      fxckedUpBagsQty,
      humanRelationsQty,
      email,
      telegram_payment_charge_id,
      payment_id
    } = body;

    // Use either field for the TON hash
    const transactionHash = body.transactionHash || body.paymentReference;

    // 1. STARS LOGIC (Your previous working code)
    if (paymentMethod === 'Stars') {
      const result = await prisma.$transaction(async (tx) => {
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
          return { success: true, message: 'Payment already processed' };
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
        return { success: false, error: 'Pending Stars transaction not found' };
      });

      return NextResponse.json(result);
    }

    // 2. TON LOGIC (Verifies Blockchain + Delivers Boost/Email)
    if (paymentMethod === 'TON') {
      if (!transactionHash) {
        return NextResponse.json({ error: 'Missing transaction hash' }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        // A. Verify Blockchain (Security)
        const paymentResult = await processPayment(
          tx,
          paymentMethod,
          transactionHash,
          totalAmount,
          userId,
          bookCount,
          null,
          fxckedUpBagsQty,
          humanRelationsQty
        );

        if (!paymentResult.success) throw new Error("TON Blockchain verification failed");

        const dbUser = await tx.user.findUnique({ where: { telegramId: BigInt(userId) } });

        // B. Prepare Delivery Data
        const booksToPurchase = [
          ...(Number(fxckedUpBagsQty) > 0 ? [{ id: "67c320d4fc2a0117cea7bbe2", qty: Number(fxckedUpBagsQty), title: "FxckedUpBags" }] : []),
          ...(Number(humanRelationsQty) > 0 ? [{ id: "67c320d4fc2a0117cea7bbe3", qty: Number(humanRelationsQty), title: "Human Relations" }] : [])
        ];

        const availableCodes = await tx.generatedCode.findMany({
          where: { bookId: { in: booksToPurchase.map(b => b.id) }, isUsed: false },
          take: Number(fxckedUpBagsQty) + Number(humanRelationsQty)
        });

        // C. Deliver Boost, Update Stock, Send Email
        return await updateDatabaseTransaction(
          tx,
          booksToPurchase,
          availableCodes.map(c => c.code),
          userId.toString(),
          email || dbUser?.email || "",
          "TON",
          Number(totalAmount),
          0, // tappingRate increment
          0, // points increment
          transactionHash // orderId
        );
      });

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });

  } catch (error: any) {
    console.error('❌ Verify Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}