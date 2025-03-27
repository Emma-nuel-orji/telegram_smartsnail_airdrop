import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { prisma } from '@/prisma/client';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function verifyStoryShare(telegramId: string, trackingId: string, taskId: string): Promise<boolean> {
  try {
    const response = await axios.get(`${TELEGRAM_API_URL}/getUpdates`, {
      params: {
        offset: -10,
        allowed_updates: ['story'],
      },
    });

    const updates = response.data.result;
    const storyShare = updates.find((update: { story: { from: { id: any }; date: number } }) => 
      update.story?.from?.id === telegramId &&
      Date.now() - update.story.date * 1000 < 2 * 60 * 1000
    );

    if (storyShare) {
      await prisma.storyShare.create({
        data: {
          userId: telegramId,
          trackingId: trackingId,
          taskId: taskId,
        },
      });
      console.log("Story share verified");

      await prisma.storyShare.update({
        where: { trackingId },
        data: { completedAt: new Date() },
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying story share:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, telegramId, reward, trackingId } = body;

    if (!taskId || !telegramId || !reward || !trackingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: telegramId.toString(),
        completed: true,
      },
    });

    if (existingTask) {
      return NextResponse.json({ error: 'Task already completed' }, { status: 400 });
    }

    const isShared = await verifyStoryShare(telegramId, trackingId, taskId);

    if (!isShared) {
      return NextResponse.json({ error: 'Story share not detected. Please try again.' }, { status: 400 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { completed: true },
    });

    const updatedUser = await prisma.user.update({
      where: {  telegramId: telegramId },
      data: { points: { increment: reward } },
    });

    return NextResponse.json({
      message: 'Task completed, reward granted, and confetti triggered!',
      task: updatedTask,
      user: updatedUser,
    }, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}