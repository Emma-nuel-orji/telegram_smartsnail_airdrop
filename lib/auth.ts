// File: lib/auth.ts
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Telegram Mini App authentication
export async function authenticateTelegramUser(request: NextRequest) {
  try {
    // Get Telegram WebApp data from headers or query parameters
    const initData = request.headers.get('x-telegram-init-data') || 
                     new URL(request.url).searchParams.get('tgInitData');
    
    if (!initData) {
      return { isAuthenticated: false };
    }
    
    // Parse and validate the Telegram WebApp init data
    // This is a simplified version - in production, you should validate the hash
    const parsedData = parseInitData(initData);
    
    if (!parsedData || !parsedData.user) {
      return { isAuthenticated: false };
    }
    
    const telegramId = parsedData.user.id;
    
    // Check if user exists in the database
    let user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    
    // Create user if they don't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId: BigInt(telegramId),
          username: parsedData.user.username,
          firstName: parsedData.user.first_name,
          lastName: parsedData.user.last_name
        }
      });
    }
    
    // Check if user is admin (replace with your admin logic)
    const isAdmin = process.env.ADMIN_TELEGRAM_IDS?.split(',').includes(telegramId.toString()) || false;
    
    return { 
      isAuthenticated: true, 
      telegramId,
      user,
      isAdmin
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { isAuthenticated: false };
  }
}

// Helper function to parse the init data
function parseInitData(initDataString: string) {
  try {
    const urlParams = new URLSearchParams(initDataString);
    const dataStr = urlParams.get('user');
    
    if (!dataStr) return null;
    
    return { 
      user: JSON.parse(dataStr)
    };
  } catch (error) {
    console.error('Failed to parse init data:', error);
    return null;
  }
}