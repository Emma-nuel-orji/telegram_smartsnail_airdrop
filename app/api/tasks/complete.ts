import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: NextRequest) {
  try {
    const { telegramId, taskId, reward } = await req.json();

    if (!telegramId || !taskId || typeof reward !== 'number') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const telegramIdBigInt = BigInt(telegramId);

    // Fetch the user based on telegramId
    const user = await prisma.user.findUnique({
      where: { telegramId: telegramIdBigInt },
      select: { points: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update the task completion status
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        completed: true,
        completedTime: new Date().toISOString(),
      },
    });

    // Increment the user's points based on the reward
    const updatedUser = await prisma.user.update({
      where: { telegramId: telegramIdBigInt },
      data: { points: { increment: reward } },
    });

    return NextResponse.json({
      success: true,
      points: updatedUser.points,
    });
  } catch (error) {
    console.error('Error completing task and increasing points:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
