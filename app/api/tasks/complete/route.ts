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

    // Find task using `id`
    let task = await prisma.task.findUnique({
      where: {
        id: String(taskId), // Ensure it's a string
      }
    });

    console.log('Found Task:', task);

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Store mongoId before operations
    const taskMongoId = task.mongoId;
    
    console.log('Task IDs to be used:', {
      id: task.id,
      mongoId: task.mongoId,
      taskId: String(taskId),
      taskMongoId: String(taskMongoId)
    });

    // Assign userId if it's missing
    if (!task.userId) {
      try {
        task = await prisma.task.update({
          where: { id: taskId }, // Use the string ID ("1")
          data: { userId: userId, completed: true, completedTime: new Date() }
        });
        console.log('Updated Task with User ID:', task);
      } catch (updateError) {
        console.error('Error updating task with userId:', updateError);
        // Try alternative approach
        task = await prisma.task.update({
          where: { id: String(taskId) },
          data: { userId: user.id },
        });
        console.log('Alternative update successful with id:', task);
      }
    }

    // Create completed task record
    const completedTask = await prisma.completedTask.create({
      data: {
        taskId: task.id,
        userId: user.id,
        completedAt: new Date(),
      },
    });
    console.log('Created completedTask record:', completedTask);

    // Verify task still exists right before update
    const taskStillExists = await prisma.task.findUnique({
      where: { id: String(taskId) },
    });
    console.log('Task still exists before update?', !!taskStillExists, taskStillExists);

    // Try using updateMany first (doesn't throw if not found)
    console.log('Attempting updateMany on task...');
    const updateManyResult = await prisma.task.updateMany({
      where: { id: String(taskId) },
      data: {
        completed: true,
        completedTime: new Date(),
      },
    });
    console.log('updateMany result:', updateManyResult);

    let updatedTask, updatedUser;

    // If updateMany worked, update the user
    if (updateManyResult.count > 0) {
      console.log('updateMany succeeded, now updating user');
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          points: {
            increment: reward ?? task.reward ?? 0,
          },
        },
      });
      
      // Fetch the updated task
      updatedTask = await prisma.task.findUnique({
        where: { id: String(taskId) },
      });
    } else {
      console.log('updateMany failed, trying alternative approaches');
      
      // Try different approaches
      try {
        console.log('Attempting to update with mongoId...');
        updatedTask = await prisma.task.update({
          where: { mongoId: String(taskMongoId) },
          data: {
            completed: true,
            completedTime: new Date(),
          },
        });
        console.log('Update with mongoId successful');
      } catch (err1) {
        console.error('Update with mongoId failed:', err1);
        
        try {
          console.log('Attempting to update with id...');
          updatedTask = await prisma.task.update({
            where: { id: String(taskId) },
            data: {
              completed: true,
              completedTime: new Date(),
            },
          });
          console.log('Update with id successful');
        } catch (err2) {
          console.error('Update with id failed:', err2);
          
          // Last resort: re-fetch and try once more
          console.log('Last resort: re-fetching task and trying again');
          const freshTask = await prisma.task.findUnique({
            where: { id: String(taskId) },
          });
          
          if (freshTask) {
            updatedTask = await prisma.task.update({
              where: { mongoId: String(freshTask.mongoId) },
              data: {
                completed: true,
                completedTime: new Date(),
              },
            });
          } else {
            throw new Error('Task could not be found after multiple attempts');
          }
        }
      }
      
      // Update user points
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          points: {
            increment: reward ?? task.reward ?? 0,
          },
        },
      });
    }

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