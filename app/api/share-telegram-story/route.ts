import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // Adjusted path to your prisma client
import { authenticateTelegramUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateTelegramUser(request);
    if (!auth.isAuthenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId, reward } = await request.json();
    const telegramId = auth.telegramId;

    // 1. Check if this specific user already finished this task
    const alreadyDone = await prisma.completedTask.findFirst({
      where: {
        userId: auth.id, // Use the internal DB user ID
        taskId: taskId
      }
    });

    if (alreadyDone) {
      return NextResponse.json({ error: 'Already claimed' }, { status: 400 });
    }

    // 2. Transaction: Update points and create a user-specific completion record
    // We DO NOT update the 'Task' table directly because that is global
    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { telegramId: BigInt(telegramId) },
        data: { points: { increment: reward } }
      });

      await tx.completedTask.create({
        data: {
          taskId: taskId,
          userId: auth.id,
          points: reward,
          completedAt: new Date(),
        }
      });

      return updatedUser;
    });

    return NextResponse.json({
      success: true,
      points: result.points.toString()
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}