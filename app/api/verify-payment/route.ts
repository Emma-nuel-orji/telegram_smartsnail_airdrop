import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from '@/lib/auth';
import { verifyTonPayment } from '@/src/utils/paymentUtils';
import { sendPurchaseEmail } from '@/src/utils/emailUtils';

export async function POST(req: NextRequest) {
  try {
    /* =========================
       1. AUTHENTICATION
    ========================= */
    const auth = await authenticateTelegramUser(req);
    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const telegramId = auth.telegramId;
    const body = await req.json();
    const { paymentMethod, transactionHash, fxckedUpBagsQty, humanRelationsQty } = body;

    /* =========================
       2. STARS FLOW
    ========================= */
    if (paymentMethod === 'Stars') {
      const result = await prisma.$transaction(async (tx) => {
        const pendingTransaction = await tx.pendingTransaction.findFirst({
          where: {
            telegramId: telegramId.toString(),
            status: 'PENDING',
          },
          include: { order: true },
          orderBy: { createdAt: 'desc' }
        });

        if (!pendingTransaction?.order) {
          throw new Error('No pending Stars transaction found');
        }

        const updatedPending = await tx.pendingTransaction.update({
          where: { id: pendingTransaction.id },
          data: { status: 'COMPLETED' },
        });

        const updatedOrder = await tx.order.update({
          where: { id: pendingTransaction.order.id },
          data: { status: 'SUCCESS' },
        });

        return { success: true, orderId: updatedOrder.orderId };
      });

      return NextResponse.json(result);
    }

    /* =========================
       3. TON FLOW
    ========================= */
    if (paymentMethod === 'TON') {
      if (!transactionHash) {
        return NextResponse.json({ error: 'Missing transaction hash' }, { status: 400 });
      }

      const fubQty = Number(fxckedUpBagsQty) || 0;
      const hrQty = Number(humanRelationsQty) || 0;

      if (fubQty <= 0 && hrQty <= 0) {
        return NextResponse.json({ error: 'No items specified' }, { status: 400 });
      }

      // Resolve book data
      const bookTitles = [
        ...(fubQty > 0 ? ["FxckedUpBags (Undo Yourself)"] : []),
        ...(hrQty > 0 ? ["Human Relations"] : []),
      ];

      const books = await prisma.book.findMany({
        where: { title: { in: bookTitles } }
      });

      if (!books.length) {
        return NextResponse.json({ error: 'Books not found in database' }, { status: 404 });
      }

      // Calculation logic
      let totalAmount = 0;
      let totalTappingRate = 0;
      let totalPoints = 0;

      const booksToPurchase = books.map(book => {
        const qty = book.title.includes("FxckedUpBags") ? fubQty : hrQty;
        totalAmount += qty * Number(book.priceTon || 0);
        totalTappingRate += qty * Number(book.tappingRate || 0);
        totalPoints += qty * Number(book.coinsReward || 0);

        return { id: book.id, qty, title: book.title };
      });

      // Verification
      const walletAddress = process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS;
      if (!walletAddress) {
        return NextResponse.json({ error: 'Server wallet configuration missing' }, { status: 500 });
      }

      const isValid = await verifyTonPayment(walletAddress, totalAmount, transactionHash);
      if (!isValid) {
        return NextResponse.json({ error: 'TON transaction not found or invalid amount' }, { status: 400 });
      }

      /* =========================
         4. DATABASE TRANSACTION
      ========================= */
      const result = await prisma.$transaction(async (tx) => {
        // 1. Check for double-spend
        const existingOrder = await tx.order.findFirst({
          where: { transactionReference: transactionHash }
        });

        if (existingOrder?.status === 'SUCCESS') {
          return { success: true, message: 'Already processed', orderId: existingOrder.orderId };
        }

        // 2. Find User (CRITICAL CHECK)
        const user = await tx.user.findUnique({
          where: { telegramId }
        });

        if (!user) {
          throw new Error('User not found in database');
        }

        // 3. Create/Update Order
        const order = await tx.order.upsert({
          where: { transactionReference: transactionHash },
          create: {
            orderId: `TON-${Date.now()}`,
            paymentMethod: 'TON',
            totalAmount,
            status: 'SUCCESS',
            transactionReference: transactionHash,
          },
          update: { status: 'SUCCESS' }
        });

        // 4. Handle Digital Codes
        const totalQty = fubQty + hrQty;
        const availableCodes = await tx.generatedCode.findMany({
          where: { isUsed: false, isReserved: false },
          take: totalQty,
          orderBy: { createdAt: 'asc' }
        });

        if (availableCodes.length < totalQty) {
          throw new Error('Out of digital codes. Contact support.');
        }

        // 5. Create Purchase Record
   
          const purchase = await tx.purchase.create({
            data: {
              paymentType: 'TON',
              amountPaid: Math.floor(totalAmount),
              booksBought: totalQty,
              fxckedUpBagsQty: fubQty,
              humanRelationsQty: hrQty,
              coinsReward: totalPoints,
              // Use 'connect' for relations to avoid "unknown property" errors
              user: { connect: { id: user.id } },
              order: { connect: { id: order.id } },
            }
          });

        // 6. Update Stock and Codes
        for (const b of booksToPurchase) {
          await tx.book.update({
            where: { id: b.id },
            data: { usedStock: { increment: b.qty } }
          });
        }

        await tx.generatedCode.updateMany({
          where: { id: { in: availableCodes.map(c => c.id) } },
          data: {
            isUsed: true,
            purchaseId: purchase.id,
            usedAt: new Date()
          }
        });

        // 7. Update User Boosts & Points
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const now = new Date();
        const currentExpiry = user.boostExpiresAt && user.boostExpiresAt > now ? user.boostExpiresAt : now;
        
        const updatedUser = await tx.user.update({
          where: { telegramId },
          data: {
            tappingRate: { increment: totalTappingRate },
            points: { increment: BigInt(totalPoints) }, // Ensure BigInt if schema requires it
            boostExpiresAt: new Date(currentExpiry.getTime() + (totalQty * MS_PER_DAY)),
          }
        });

        /* =========================
           5. ASYNC EMAIL (OUTSIDE TX LOGIC)
        ========================= */
        if (user.email && user.email.trim().includes('@')) {
          sendPurchaseEmail(
            user.email,
            booksToPurchase.map(b => ({ bookId: b.id, quantity: b.qty })),
            availableCodes.map(c => c.code)
          ).catch(e => console.error("Email Delay Error:", e));
        }

        return {
          success: true,
          orderId: order.orderId,
          points: Number(updatedUser.points),
          tappingRate: Number(updatedUser.tappingRate),
        };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unsupported method' }, { status: 400 });

  } catch (error: any) {
    console.error("CRITICAL VERIFY ERROR:", error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}