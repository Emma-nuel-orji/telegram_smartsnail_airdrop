import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from '@/lib/auth';
import { verifyTonPayment } from '@/src/utils/paymentUtils';
import { sendPurchaseEmail } from '@/src/utils/emailUtils';

export async function POST(req: NextRequest) {
  try {
    /* =========================
       1. AUTH
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
          return { success: false, error: 'No pending Stars transaction found' };
        }

        if (pendingTransaction.status === 'COMPLETED') {
          return { success: true, message: 'Already processed' };
        }

        await tx.pendingTransaction.update({
          where: { id: pendingTransaction.id },
          data: { status: 'COMPLETED' },
        });

        await tx.order.update({
          where: { id: pendingTransaction.order.id },
          data: { status: 'SUCCESS' },
        });

        return { success: true, orderId: pendingTransaction.order.orderId };
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
        return NextResponse.json({ error: 'No books specified' }, { status: 400 });
      }

      /* =========================
         4. FETCH BOOKS FROM DB
         Calculate everything server-side
      ========================= */
      const bookTitles = [
        ...(fubQty > 0 ? ["FxckedUpBags (Undo Yourself)"] : []),
        ...(hrQty > 0 ? ["Human Relations"] : []),
      ];

      const books = await prisma.book.findMany({
        where: { title: { in: bookTitles } }
      });

      if (!books.length) {
        return NextResponse.json({ error: 'Books not found' }, { status: 404 });
      }

      // Server-side calculation — never trust client
      let totalAmount = 0;
      let totalTappingRate = 0;
      let totalPoints = 0;

      const booksToPurchase = books.map(book => {
        const qty = book.title.includes("FxckedUpBags") ? fubQty : hrQty;
        totalAmount += qty * Number(book.priceTon || 0);
        totalTappingRate += qty * Number(book.tappingRate || 0);
        totalPoints += qty * Number(book.coinsReward || 0);

        return {
          id: book.id,
          bookId: book.id,
          qty,
          title: book.title,
          book: {
            ...book,
            coinsReward: Number(book.coinsReward),
            priceCard: Number(book.priceCard),
            priceTon: Number(book.priceTon),
            usedStock: book.usedStock,
            stockLimit: book.stockLimit,
            tappingRate: Number(book.tappingRate),
          }
        };
      });

      /* =========================
         5. VERIFY TON PAYMENT
      ========================= */
      const walletAddress = process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS;
      if (!walletAddress) {
        return NextResponse.json({ error: 'Wallet not configured' }, { status: 500 });
      }

      const isValid = await verifyTonPayment(walletAddress, totalAmount, transactionHash);
      if (!isValid) {
        return NextResponse.json({ error: 'TON transaction invalid' }, { status: 400 });
      }

      /* =========================
         6. PROCESS IN TRANSACTION
      ========================= */
      const result = await prisma.$transaction(async (tx) => {
        // Check for duplicate transaction
        const existingOrder = await tx.order.findFirst({
          where: { transactionReference: transactionHash }
        });

        if (existingOrder?.status === 'SUCCESS') {
          return { success: true, message: 'Already processed', orderId: existingOrder.orderId };
        }

        // Find or create order
        let order = existingOrder;
        if (!order) {
          order = await tx.order.create({
            data: {
              orderId: `TON-${Date.now()}`,
              paymentMethod: 'TON',
              totalAmount,
              status: 'SUCCESS',
              transactionReference: transactionHash,
            }
          });
        } else {
          order = await tx.order.update({
            where: { id: order.id },
            data: { status: 'SUCCESS', transactionReference: transactionHash }
          });
        }

        // Find user using VERIFIED telegramId from token
        const user = await tx.user.findUnique({
          where: { telegramId }
        });

        if (!user) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'FAILED' }
          });
          return { success: false, error: 'User not found' };
        }

        // Get available codes
        const totalQty = fubQty + hrQty;
        const availableCodes = await tx.generatedCode.findMany({
          where: { isUsed: false, isReserved: false },
          take: totalQty,
          orderBy: { createdAt: 'asc' }
        });

        if (availableCodes.length < totalQty) {
          return { success: false, error: 'Insufficient codes available' };
        }

        // Reserve codes
        await tx.generatedCode.updateMany({
          where: { id: { in: availableCodes.map(c => c.id) } },
          data: { isReserved: true }
        });

        // Create purchase record
        const purchase = await tx.purchase.create({
          data: {
            paymentType: 'TON',
            amountPaid: Math.floor(totalAmount),
            booksBought: totalQty,
            fxckedUpBagsQty: fubQty,
            humanRelationsQty: hrQty,
            coinsReward: totalPoints,
            user: { connect: { id: user.id } },
            order: { connect: { id: order.id } },
          }
        });

        // Update book stock
        for (const b of booksToPurchase) {
          await tx.book.update({
            where: { id: b.id },
            data: { usedStock: { increment: b.qty } }
          });
        }

        // Mark codes as used
        await tx.generatedCode.updateMany({
          where: { id: { in: availableCodes.map(c => c.id) } },
          data: {
            isUsed: true,
            isReserved: false,
            purchaseId: purchase.id,
            usedAt: new Date()
          }
        });

        // Calculate boost
        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const boostDurationMs = totalQty * MS_PER_DAY;
        const now = new Date();
        const currentExpiry = user.boostExpiresAt && user.boostExpiresAt > now
          ? user.boostExpiresAt : now;
        const newBoostExpiry = new Date(currentExpiry.getTime() + boostDurationMs);

        // Update user — using server-calculated values
        const updatedUser = await tx.user.update({
          where: { telegramId },
          data: {
            tappingRate: { increment: totalTappingRate },
            points: { increment: totalPoints },
            boostExpiresAt: newBoostExpiry,
          }
        });

        // Send email (non-blocking)
        const purchasedBooks = booksToPurchase.map(b => ({
          bookId: b.id,
          quantity: b.qty
        }));

        try {
          await sendPurchaseEmail(
            user.email || '',
            purchasedBooks,
            availableCodes.map(c => c.code)
          );
        } catch {
          // Email failure should not fail the purchase
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

    return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });

  } catch (error) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}