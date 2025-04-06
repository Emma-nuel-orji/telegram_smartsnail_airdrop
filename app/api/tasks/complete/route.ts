// This is a suggested fix for your `/app/api/tasks/complete/route.js` file
// You can modify it to fit your specific implementation

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
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });
    
    console.log('Found User:', user);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Find task using string ID
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });
    
    console.log('Found Task:', task);
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Keep track of task IDs for debugging
    const taskIds = {
      id: taskId,
      mongoId: task.mongoId
    };
    console.log('Task IDs to be used:', taskIds);
    
    // Update the task - IMPORTANT: use the string ID, not the MongoDB ObjectId
    try {
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: { 
          userId: user.id,
          completed: true,
          completedTime: new Date()
        }
      });
      
      console.log('Updated Task with User ID:', updatedTask?.id || null);
      
      // Use optional chaining to prevent null errors
      const taskResult = updatedTask?.id || null;
      
      // If task was updated successfully, update user points
      if (updatedTask) {
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { points: BigInt(user.points) + BigInt(reward || task.reward || 0) }
        });
        
        // Create completed task record
        await prisma.completedTask.create({
          data: {
            taskId: taskId,
            userId: user.id,
            points: reward || task.reward || 0,
            completedAt: new Date()
          }
        });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Task completed successfully',
          points: updatedUser.points.toString()
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Task update failed' 
        }, { status: 500 });
      }
    } catch (updateError) {
      console.error('Error updating task with userId:', updateError);
      
      // Try an alternative approach if the update fails
      try {
        // Just update the user points without touching the task
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { points: BigInt(user.points) + BigInt(reward || task.reward || 0) }
        });
        
        // Create completed task record anyway
        await prisma.completedTask.create({
          data: {
            taskId: taskId,
            userId: user.id,
            points: reward || task.reward || 0,
            completedAt: new Date()
          }
        });
        
        return NextResponse.json({ 
          success: true, 
          message: 'Task marked as completed (alternative method)',
          points: updatedUser.points.toString()
        });
      } catch (altError) {
        console.error('Alternative approach also failed:', altError);
        return NextResponse.json({ 
          success: false, 
          error: 'Both update methods failed' 
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Detailed Error completing task:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}