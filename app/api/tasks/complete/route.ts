import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taskId, reward, telegramId } = body;

    console.log('Received Request Body:', body);
    console.log('taskId type:', typeof taskId, 'value:', taskId);
    console.log('telegramId type:', typeof telegramId, 'value:', telegramId);

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

    console.log('Looking for task with ID:', taskId);
    
    // Debug: First check if we can find the task using different approaches
    const taskByIdUnique = await prisma.task.findUnique({
      where: { id: taskId },
    });
    
    console.log('Task by findUnique on id:', taskByIdUnique);
    
    const taskByMongoId = await prisma.task.findUnique({
      where: { mongoId: taskId },
    });
    
    console.log('Task by findUnique on mongoId:', taskByMongoId);
    
    // Find task
    let task = await prisma.task.findFirst({
      where: {
        id: taskId,
      }
    });

    console.log('Found Task by findFirst:', task);
    console.log('Task is null?', task === null);
    
    if (task) {
      console.log('Task ID:', task.id);
      console.log('MongoDB ID:', task.mongoId);
    }

    if (!task) {
      // If task not found by id, try finding by mongoId
      task = await prisma.task.findFirst({
        where: {
          mongoId: taskId,
        }
      });
      
      console.log('Found Task by mongoId fallback:', task);
      
      if (!task) {
        return NextResponse.json(
          { 
            error: 'Task not found', 
            details: {
              searchedId: taskId
            }
          },
          { status: 404 }
        );
      }
    }

    console.log('Final task to be used:', task);
    console.log('Task properties:', Object.keys(task));

    // Ensure the task has a userId assigned
    if (!task.userId) {
      console.log('No userId on task, updating with:', user.id);
      try {
        task = await prisma.task.update({
          where: { 
            // Use the correct ID field for updating
            id: task.id 
          },
          data: { 
            userId: user.id 
          },
        });
        console.log('Updated Task with User ID:', task);
      } catch (updateError) {
        console.error('Error updating task:', updateError);
        // Try with mongoId if id fails
        try {
          task = await prisma.task.update({
            where: { mongoId: task.mongoId },
            data: { userId: user.id },
          });
          console.log('Updated Task with User ID using mongoId:', task);
        } catch (fallbackError) {
          console.error('Fallback update also failed:', fallbackError);
          return NextResponse.json(
            { error: 'Failed to update task', details: String(fallbackError) },
            { status: 500 }
          );
        }
      }
    }

    console.log('Task before creating CompletedTask:', task);
    console.log('User ID for CompletedTask:', user.id);

    // Create a completed task record
    try {
      const completedTask = await prisma.completedTask.create({
        data: {
          taskId: task.id,
          userId: user.id,
          completedAt: new Date(),
        },
      });
      
      console.log('Created CompletedTask:', completedTask);

      // Update the task status and update user points
      try {
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
        
        console.log('Transaction completed successfully');
        console.log('Updated task:', updatedTask);
        console.log('Updated user points:', updatedUser.points);

        return NextResponse.json({
          success: true,
          task: updatedTask,
          completedTask,
          userPoints: updatedUser.points,
        });
      } catch (transactionError) {
        console.error('Transaction error:', transactionError);
        return NextResponse.json(
          { error: 'Failed to update task and user', details: String(transactionError) },
          { status: 500 }
        );
      }
    } catch (completedTaskError) {
      console.error('Error creating completed task:', completedTaskError);
      return NextResponse.json(
        { error: 'Failed to create completed task', details: String(completedTaskError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Detailed Error completing task:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Failed to complete task',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}