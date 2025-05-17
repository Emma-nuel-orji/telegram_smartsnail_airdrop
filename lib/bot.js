import { Telegraf } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { session } from 'telegraf';
dotenv.config();

console.log('Bot starting up...');

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
    throw new Error('TELEGRAM_BOT_TOKEN is not defined in the environment variables.');
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://telegram-smartsnail-airdrop.vercel.app";
const bot = new Telegraf(botToken);
const prisma = new PrismaClient();

// Add session middleware with proper typing to avoid potential errors
bot.use(session());

// Add middleware to log all updates for debugging
bot.use(async (ctx, next) => {
    console.log('Received update:', JSON.stringify(ctx.update));
    try {
        await next();
    } catch (error) {
        console.error('Error in middleware:', error);
        // Don't try to reply here as it might cause another error
    }
});

// Define commands first with error handling
bot.command('ping', async (ctx) => {
    try {
        console.log('Ping command received from', ctx.from?.id);
        await ctx.reply('Pong! Bot is alive.');
    } catch (error) {
        console.error('Error in ping command:', error);
        try {
            await ctx.reply('Sorry, there was an error processing your command.');
        } catch (replyError) {
            console.error('Could not send error message:', replyError);
        }
    }
});

// Fixed start command with proper BigInt handling for telegramId
bot.start(async (ctx) => {
    try {
        const userId = ctx.from?.id; // This is a number from Telegram
        // Get the payload after /start
        const startPayload = ctx.startPayload;
        
        console.log(`New user started: ${userId}, Referral payload: ${startPayload}`); 
        
        // Create or update user
        try {
            const userResponse = await fetch(`${API_BASE_URL}/api/user`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    telegramId: userId.toString(), // Send as string to preserve BigInt value
                    firstName: ctx.from?.first_name || '',
                    lastName: ctx.from?.last_name || '',
                    username: ctx.from?.username || '',
                }),
            });
            
            if (!userResponse.ok) {
                console.error(`API Error: User creation failed with status ${userResponse.status}`);
                console.error(await userResponse.text());
            }
        } catch (error) {
            console.error('Error creating user:', error);
        }
        
        // Process referral if exists
        if (startPayload && startPayload.trim() !== '') {
            try {
                console.log(`Processing referral from ${startPayload} to ${userId}`);
                
                // Keep referrerId as string to preserve BigInt value
                const referrerId = startPayload.trim();
                
                // Check if it's a valid ID format (numerical string)
                if (!/^\d+$/.test(referrerId)) {
                    console.error(`Invalid referrer ID: ${startPayload}`);
                    ctx.reply('Invalid referral link. Please try again with a valid referral.');
                    return;
                }
                
                const referralResponse = await fetch(`${API_BASE_URL}/api/referrals`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userTelegramId: userId.toString(), // Send as string
                        referrerTelegramId: referrerId, // Already a string
                    }),
                });
                
                if (!referralResponse.ok) {
                    console.error(`API Error: Referral creation failed with status ${referralResponse.status}`);
                    console.error(await referralResponse.text());
                } else {
                    ctx.reply(`You joined with a referral! 🎉 Your referrer will be rewarded.`);
                }
            } catch (error) {
                console.error('Error processing referral:', error);
            }
        }
        
        // Always send welcome message regardless of referral status
        await ctx.reply(`Welcome, ${ctx.from.first_name}! 🎉`);
        
    } catch (error) {
        console.error('Error in start handler:', error);
        try {
            ctx.reply('Sorry, there was an error processing your start command.');
        } catch (replyError) {
            console.error('Could not send error message:', replyError);
        }
    }
});

// Admin user IDs
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS?.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id))) || [];

// Set bot commands - This ensures they appear in the Telegram menu
bot.telegram.setMyCommands([
    { command: 'ping', description: 'Check if bot is alive' },
    { command: 'schedule_fight', description: 'Schedule a new fight' },
    { command: 'resolve_fight', description: 'Resolve an existing fight' },
    { command: 'list_fights', description: 'List all active fights' },
    { command: 'addfighter', description: 'Add a new fighter' }
]).catch(error => {
    console.error('Failed to set commands:', error);
});

// Check if a user is an admin
function isAdmin(ctx) {
    const userId = ctx.from?.id;
    const isUserAdmin = userId !== undefined && ADMIN_USER_IDS.includes(userId);
    console.log(`Admin check for user ${userId}: ${isUserAdmin ? 'Is admin' : 'Not admin'}`);
    return isUserAdmin;
}

// Add proper error handling for bot launch
if (process.env.NODE_ENV !== 'production') {
    bot.launch()
      .then(() => {
        console.log('Bot started successfully (polling)');
        console.log('Admin IDs:', ADMIN_USER_IDS);
        return bot.telegram.getMe();
      })
      .then((botInfo) => {
        console.log('Connected to bot:', botInfo.username);
      })
      .catch((err) => {
        console.error('Failed to start bot:', err);
      });
  
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  }
  

// Re-export everything properly
export { bot };
export default bot;