import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    /* =========================
       1. AUTH (STANDARDIZED)
    ========================= */
    const auth = await authenticateTelegramUser(req);

    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const telegramId = auth.telegramId;

    /* =========================
       2. INPUT
    ========================= */
    const { taskId } = await req.json();

    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing taskId' },
        { status: 400 }
      );
    }

    console.log(`User ${telegramId} attempting task ${taskId}`);

    /* =========================
       3. TRANSACTION (SAFE)
    ========================= */

const result = await prisma.$transaction(async (tx) => {
  // Find user
  const user = await tx.user.findUnique({
    where: { telegramId },
  });

  if (!user) throw new Error('User not found');

  // Find task definition
  const task = await tx.task.findUnique({
    where: { id: taskId.toString() },
  });

  if (!task) throw new Error('Task not found');

  // 🚫 Prevent double claim: Check the user-specific completion table
  const alreadyCompleted = await tx.completedTask.findFirst({
    where: {
      userId: user.id,
      taskId: taskId.toString(),
    },
  });

  if (alreadyCompleted) {
    throw new Error('Task already completed');
  }

  const pointsToAdd = Number(task.reward || 0);

  // Update user points
  const updatedUser = await tx.user.update({
    where: { id: user.id },
    data: {
      points: {
        increment: BigInt(pointsToAdd),
      },
    },
  });

  // ✅ Create the unique record for THIS user and THIS task
  await tx.completedTask.create({
    data: {
      taskId: taskId.toString(),
      userId: user.id,
      points: pointsToAdd,
      completedAt: new Date(),
    },
  });

  return updatedUser;
});

    return NextResponse.json({
      success: true,
      message: 'Task completed successfully',
      points: result.points.toString(),
    });

  } catch (error: any) {
    console.error('Task Completion Error:', error.message);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}