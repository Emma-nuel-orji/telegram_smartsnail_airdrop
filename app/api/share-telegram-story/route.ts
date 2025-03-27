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
      // Ensure all required fields are populated
      await prisma.storyShare.create({
        data: {
          userId: telegramId,
          trackingId: trackingId,
          taskId: taskId,
          clicks: 0,  // Explicitly set initial clicks
          createdAt: new Date(),  // Explicitly set createdAt
          completedAt: new Date()  // Set completedAt if verification is successful
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
    // Log raw request body
    const rawBody = await request.text();
    console.log("Raw Request Body:", rawBody);

    // Parse body manually
    let body;
try {
  body = JSON.parse(rawBody);
} catch (parseError: unknown) {
  // Type-safe error handling
  const errorMessage = parseError instanceof Error 
    ? parseError.message 
    : typeof parseError === 'string' 
    ? parseError 
    : 'Unknown JSON parsing error';

  console.error("JSON Parsing Error:", errorMessage);
  
  return NextResponse.json({
    error: 'Invalid JSON',
    details: errorMessage
  }, { status: 400 });
}

    // Log parsed body details
    console.log("Parsed Body:", {
      taskId: body.taskId,
      telegramIdType: typeof body.telegramId,
      telegramId: body.telegramId,
      rewardType: typeof body.reward,
      reward: body.reward,
      trackingId: body.trackingId
    });

    // Validate all required fields
    const { taskId, telegramId, reward, trackingId } = body;

    // Comprehensive input validation
    if (!taskId) {
      return NextResponse.json({ 
        error: 'Task ID is required',
        details: 'taskId cannot be empty or undefined' 
      }, { status: 400 });
    }

    if (!telegramId) {
      return NextResponse.json({ 
        error: 'Telegram ID is required',
        details: 'telegramId cannot be empty or undefined' 
      }, { status: 400 });
    }

    if (reward === undefined || reward === null) {
      return NextResponse.json({ 
        error: 'Reward is required',
        details: 'reward must be a valid number' 
      }, { status: 400 });
    }

    if (!trackingId) {
      return NextResponse.json({ 
        error: 'Tracking ID is required',
        details: 'trackingId cannot be empty or undefined' 
      }, { status: 400 });
    }

    // Check for existing completed task
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        userId: telegramId.toString(), // Ensure string conversion
        completed: true
      }
    });

    if (existingTask) {
      return NextResponse.json({ 
        error: 'Task already completed',
        details: 'This task has already been marked as completed' 
      }, { status: 400 });
    }

    // Update task as completed
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { 
        completed: true,
        userId: telegramId.toString() // Ensure string conversion
      }
    });

    // Update user points
    const updatedUser = await prisma.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: { points: { increment: reward } }
    });

    // Create story share record
    await prisma.storyShare.create({
      data: {
        userId: telegramId.toString(),
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