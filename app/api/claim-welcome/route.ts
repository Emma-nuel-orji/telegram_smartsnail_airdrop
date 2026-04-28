import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { authenticateTelegramUser } from '@/lib/auth';

const WELCOME_BONUS_AMOUNT = 5000n;

export async function POST(req: NextRequest) {
  try {
    /* =========================
       1. AUTH
    ========================= */
    const auth = await authenticateTelegramUser(req);

    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const telegramId = auth.telegramId; // ← from verified token

    /* =========================
       2. TRANSACTION
    ========================= */
    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({
        where: { telegramId },
      });

      if (!user) {
        user = await tx.user.create({
          data: {
            telegramId,
            points: Number(WELCOME_BONUS_AMOUNT),
            hasClaimedWelcome: true,
            tappingRate: 1,
          },
        });
        return { user, alreadyClaimed: false };
      }

      if (user.hasClaimedWelcome) {
        return { user, alreadyClaimed: true };
      }

      const updatedUser = await tx.user.update({
        where: { telegramId },
        data: {
          points: { increment: Number(WELCOME_BONUS_AMOUNT) },
          hasClaimedWelcome: true,
        },
      });

      return { user: updatedUser, alreadyClaimed: false };
    });

    /* =========================
       3. RESPONSE
    ========================= */
    if (result.alreadyClaimed) {
      return NextResponse.json(
        { success: false, error: 'Welcome bonus already claimed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      points: result.user.points.toString(),
      hasClaimedWelcome: result.user.hasClaimedWelcome,
    });

  } catch (error) {
    // No internal details exposed
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}