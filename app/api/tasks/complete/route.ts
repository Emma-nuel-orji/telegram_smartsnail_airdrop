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

    // Debug: Log all tasks to verify
    const allTasks = await prisma.task.findMany({
      where: {
        // If tasks are supposed to be numeric, ensure conversion
        id: taskId
      }
    });

    console.log('All Matching Tasks:', allTasks);

    // Find task with multiple matching strategies
    const task = await prisma.task.findFirst({
      where: {
        OR: [
          { id: taskId },  // Direct string match
          { id: taskId.toString() },  // Ensure string
          // Add any other potential matching strategies
        ]
      }
    });

    console.log('Found Task:', task);

    if (!task) {
      // Log more context if task not found
      return NextResponse.json(
        { 
          error: 'Task not found', 
          details: {
            searchedId: taskId,
            allTaskIds: allTasks.map(t => t.id)
          }
        },
        { status: 404 }
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