import { NextResponse } from 'next/server'
import axios from 'axios'
import { prisma } from '@/prisma/client';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

async function verifyStoryShare(telegramId, trackingId) {
  try {
    // Create a story share record
    await prisma.storyShare.create({
      data: {
        trackingId,
        userId: telegramId,
        taskId: taskId,
      }
    });

    // Get story update from Telegram
    const response = await axios.get(`${TELEGRAM_API_URL}/getUpdates`, {
      params: {
        offset: -10, // Get last 10 updates
        allowed_updates: ['story'],
      }
    });

    const updates = response.data.result;
    const storyShare = updates.find(update => 
      update.story?.from?.id === telegramId &&
      Date.now() - update.story.date * 1000 < 2 * 60 * 1000 // Within last 2 minutes
    );

    if (storyShare) {
      // Mark the share as completed
      await prisma.storyShare.update({
        where: { trackingId },
        data: { completedAt: new Date() }
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying story share:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { taskId, telegramId, reward, trackingId } = body;

    // Validate required fields
    if (!taskId || !telegramId || !reward || !trackingId) {
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

    const isShared = await verifyStoryShare(telegramId, trackingId);

    if (!isShared) {
      return NextResponse.json(
        { error: 'Story share not detected. Please try again.' },
        { status: 400 }
      );
    }

    // Rest of your existing task completion code...

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add a new API route for handling referral clicks (pages/api/referral/[trackingId].ts)
export async function GET(request) {
  const trackingId = request.params.trackingId;

  try {
    // Increment click count
    await prisma.storyShare.update({
      where: { trackingId },
      data: { clicks: { increment: 1 } }
    });

    // Redirect to app
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    return NextResponse.redirect(appUrl);
  } catch (error) {
    console.error('Error handling referral:', error);
    return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL);
  }
}