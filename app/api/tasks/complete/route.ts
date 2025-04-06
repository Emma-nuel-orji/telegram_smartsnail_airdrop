import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received Request Body:', body);
    
    const { taskId, reward, telegramId } = body;
    
    if (!taskId || !telegramId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Find user
    console.log(`Looking for user with telegramId: ${telegramId}`);
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });
    
    console.log('Found User:', user);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Find task using string ID
    console.log(`Looking for task with id: ${taskId}`);
    const task = await prisma.task.findUnique({
      where: { id: taskId.toString() }  // Ensure it's a string
    });
    
    console.log('Found Task:', task);
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    try {
      // Just update the user points first
      console.log(`Updating user points. Current points: ${user.points}`);
      const pointsToAdd = reward || (task.reward || 0);
      console.log(`Adding ${pointsToAdd} points`);
      
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { points: BigInt(user.points) + BigInt(pointsToAdd) }
      });
      
      console.log(`User points updated to: ${updatedUser.points}`);
      
      // Create completed task record
      console.log('Creating CompletedTask record');
      const completedTask = await prisma.completedTask.create({
        data: {
          taskId: taskId.toString(),
          userId: user.id,
          points: pointsToAdd,
          completedAt: new Date()
        }
      });
      
      console.log('Created CompletedTask:', completedTask);
      
      // Try to update the task last
      console.log('Updating task with userId');
      const updatedTask = await prisma.task.update({
        where: { id: taskId.toString() },
        data: { 
          userId: user.id,
          completed: true,
          completedTime: new Date()
        }
      });
      
      console.log('Task update successful:', updatedTask);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Task completed successfully',
        points: updatedUser.points.toString()
      });
    } catch (updateError) {
      const errorMessage = updateError instanceof Error ? updateError.message : 'Unknown error';
      console.error(`Task update error: ${errorMessage}`);
      
      // Since we already updated points and created the CompletedTask,
      // return success anyway
      return NextResponse.json({ 
        success: true, 
        message: 'Points awarded but task update failed',
        error: errorMessage
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Detailed Error completing task:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}