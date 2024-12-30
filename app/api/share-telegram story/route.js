import { NextResponse } from 'next/server'
import axios from 'axios'
import { prisma } from '@/prisma/client';

// Your Telegram bot token and endpoint
const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// Function to verify story share
async function verifyStoryShare(telegramId) {
  try {
    // Get recent updates from Telegram
    const response = await axios.get(`${TELEGRAM_API_URL}/getUpdates`, {
      params: {
        offset: -100, // Get last 100 updates
        allowed_updates: ['story'], // Focus on story updates
      }
    });

    const updates = response.data.result;

    // Look for story share from this user
    const userShared = updates.some(update => 
      update.story?.from?.id === telegramId &&
      Date.now() - update.story.date * 1000 < 5 * 60 * 1000 // Within last 5 minutes
    );

    return userShared;
  } catch (error) {
    console.error('Error verifying story share:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { taskId, telegramId, reward } = body;

    // Validate required fields
    if (!taskId || !telegramId || !reward) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user has already completed this task
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: telegramId,
        completed: true,
      },
    });

    if (existingTask) {
      return NextResponse.json(
        { error: 'Task already completed' },
        { status: 400 }
      );
    }

    // Verify the story share
    const isShared = await verifyStoryShare(telegramId);

    if (!isShared) {
      return NextResponse.json(
        { error: 'Story share not detected. Please try again.' },
        { status: 400 }
      );
    }

    // Update task completion status
    await prisma.task.upsert({
      where: {
        id_userId: {
          id: taskId,
          userId: telegramId,
        },
      },
      update: {
        completed: true,
        completedTime: new Date(),
      },
      create: {
        id: taskId,
        userId: telegramId,
        completed: true,
        completedTime: new Date(),
      },
    });

    // Update user's rewards/points
    await prisma.user.upsert({
      where: { telegramId },
      update: {
        points: {
          increment: reward
        }
      },
      create: {
        telegramId,
        points: reward
      }
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Task completed successfully',
      reward
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}