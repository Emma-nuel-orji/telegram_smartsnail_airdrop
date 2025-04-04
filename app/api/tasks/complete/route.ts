import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, reward, telegramId } = body;

    console.log('Received Request Body:', body);

    if (!taskId || !telegramId) {
      return NextResponse.json(
        { error: 'Task ID and Telegram ID are required' },
        { status: 400 }
      );
    }

    // Find the user by telegramId
    const user = await prisma.user.findUnique({
      where: {
        telegramId: BigInt(telegramId),
      },
    });

    console.log('Found User:', user);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find task by ID
    let task = await prisma.task.findUnique({
      where: {
        id: taskId,
      }
    });

    console.log('Found Task:', task);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Store the mongoId before any operations
    const taskMongoId = task.mongoId;

    // Ensure the task has a userId assigned
    if (!task.userId) {
      // Use mongoId for the update operation since it's the @id field
      task = await prisma.task.update({
        where: { mongoId: taskMongoId },
        data: { userId: user.id },
      });
      console.log('Updated Task with User ID:', task);
    }

    // Verify task still exists after update
    if (!task) {
      // Try to retrieve it again if the update didn't return it
      task = await prisma.task.findUnique({
        where: { mongoId: taskMongoId },
      });
      
      if (!task) {
        return NextResponse.json(
          { error: 'Task disappeared after update' },
          { status: 500 }
        );
      }
    }

    // Create a completed task record
    const completedTask = await prisma.completedTask.create({
      data: {
        taskId: task.id,
        userId: user.id,
        completedAt: new Date(),
      },
    });

    // Update the task status and update user points
    const [updatedTask, updatedUser] = await prisma.$transaction([
      prisma.task.update({
        where: {
          mongoId: taskMongoId, // Use mongoId for updates
        },
        data: {
          completed: true,
          completedTime: new Date(),
        },
      }),
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          points: {
            increment: reward ?? task.reward ?? 0,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      task: updatedTask,
      completedTask,
      userPoints: updatedUser.points,
    });
  } catch (error) {
    console.error('Detailed Error completing task:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete task',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}