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
    const storyShare = updates.find((update: { story: { from: { id: number }; date: number } }) => 
      BigInt(update.story?.from?.id) === BigInt(telegramId) &&
      Date.now() - update.story.date * 1000 < 2 * 60 * 1000
    );

    if (storyShare) {
      await prisma.storyShare.create({
        data: {
          telegramId: BigInt(telegramId),
          trackingId: trackingId ?? null,
          taskId,
          clicks: 0,
          createdAt: new Date(),
          completedAt: null,
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
    const rawBody = await request.text();
    console.log("Raw Request Body:", rawBody);

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown JSON parsing error';
      console.error("JSON Parsing Error:", errorMessage);
      
      return NextResponse.json({
        error: 'Invalid JSON',
        details: errorMessage
      }, { status: 400 });
    }

    console.log("Parsed Body:", {
      taskId: body.taskId,
      telegramIdType: typeof body.telegramId,
      telegramId: body.telegramId,
      rewardType: typeof body.reward,
      reward: body.reward,
      trackingId: body.trackingId
    });

    const { taskId, telegramId, reward, trackingId } = body;

    if (!taskId || !telegramId || reward === undefined || reward === null || !trackingId) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Ensure taskId, telegramId, reward, and trackingId are provided' 
      }, { status: 400 });
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: String(telegramId), // ✅ Convert to BigInt
        completed: true
      }
    });

    if (existingTask) {
      return NextResponse.json({ 
        error: 'Task already completed',
        details: 'This task has already been marked as completed' 
      }, { status: 400 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { 
        completed: true,
        userId: String(telegramId) // ✅ Convert to BigInt
      }
    });

    const updatedUser = await prisma.user.update({
      where: { telegramId: BigInt(telegramId) }, // ✅ Convert to BigInt
      data: { points: { increment: reward } }
    });

    await prisma.storyShare.create({
      data: {
        telegramId: BigInt(telegramId),
        trackingId: trackingId,
        taskId: taskId,
        completedAt: new Date()
      }
    });

    return NextResponse.json({
      message: 'Task completed successfully!',
      task: updatedTask,
      user: updatedUser
    }, { status: 200 });

  } catch (error) {
    console.error('Comprehensive Error Logging:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown error type',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });

    return NextResponse.json({ 
      error: 'Unexpected server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
