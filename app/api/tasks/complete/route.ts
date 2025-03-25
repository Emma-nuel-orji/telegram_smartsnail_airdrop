import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, reward, telegramId } = body;

    console.log('Request Body:', body);

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

    console.log('User:', user);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the task
    const task = await prisma.task.findUnique({
      where: { 
        id: String(taskId) 
      }
    });

    console.log('Task:', task);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check for existing completed task
    const existingCompletedTask = await prisma.completedTask.findFirst({
      where: {
        taskId: task.id,
        userId: user.id
      }
    });

    if (existingCompletedTask) {
      return NextResponse.json(
        { error: 'Task already completed' },
        { status: 400 }
      );
    }

    // Create a completed task record
    const completedTask = await prisma.completedTask.create({
      data: {
        taskId: task.id,
        userId: user.id,
        completedAt: new Date(),
      },
    });

    console.log('Completed Task:', completedTask);

    // Update the task status and update user points
    const [updatedTask, updatedUser] = await prisma.$transaction([
      prisma.task.update({
        where: {
          id: task.id,
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

    console.log('Updated Task:', updatedTask);
    console.log('Updated User:', updatedUser);

    return NextResponse.json({
      success: true,
      task: updatedTask,
      completedTask,
      userPoints: updatedUser.points,
    });

  } catch (error) {
    console.error('Detailed Error completing task:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { 
        error: 'Failed to complete task', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}