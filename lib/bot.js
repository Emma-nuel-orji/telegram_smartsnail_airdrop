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
        await ctx.reply(`Welcome, ${ctx.from.first_name}! 🎉`, {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🚀 Open SmartSnail App",
                    web_app: {
                      url: "https://t.me/SmartSnails_Bot/app", // Replace with your bot username
                    },
                  },
                ],
              ],
            },
          });
          
        
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
  
  bot.command('addfighter', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ Only admins can add fighters.');
    }
  
    const text = ctx.message.text || '';
    const args = text.split(' ').slice(1); // Remove command name
    if (args.length < 2) {
      return ctx.reply('Usage: /addfighter <name> <@telegram_username>');
    }
  
    const [name, telegramUsername] = args;
  
    try {
      const existing = await prisma.fighter.findUnique({ where: { telegramUsername } });
      if (existing) {
        return ctx.reply('❗ A fighter with that username already exists.');
      }
  
      const newFighter = await prisma.fighter.create({
        data: {
          name,
          telegramUsername,
          imageUrl: '', // Optional: Add logic to upload image
        },
      });
  
      ctx.reply(`✅ Fighter "${newFighter.name}" added!`);
    } catch (err) {
      console.error(err);
      ctx.reply('❌ Failed to add fighter.');
    }
  });

  
  bot.command('schedule_fight', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Only admins can schedule fights.');
  
    const text = ctx.message.text || '';
    const args = text.split(' ').slice(1); // Remove command
    if (args.length < 2) {
      return ctx.reply('Usage: /schedule_fight <@fighter1> <@fighter2>');
    }
  
    const [username1, username2] = args;
  
    try {
      const fighter1 = await prisma.fighter.findUnique({ where: { telegramUsername: username1 } });
      const fighter2 = await prisma.fighter.findUnique({ where: { telegramUsername: username2 } });
  
      if (!fighter1 || !fighter2) return ctx.reply('One or both fighters not found.');
  
      await prisma.fight.create({
        data: {
          fighter1Id: fighter1.id,
          fighter2Id: fighter2.id,
          status: 'SCHEDULED',
        },
      });
  
      ctx.reply(`🗓 Fight scheduled between ${fighter1.name} and ${fighter2.name}!`);
    } catch (err) {
      console.error(err);
      ctx.reply('❌ Failed to schedule fight.');
    }
  });

  
  bot.command('resolve_fight', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Only admins can resolve fights.');
  
    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 1) return ctx.reply('Usage: /resolve_fight <winner_username>');
  
    const winnerUsername = args[0];
  
    try {
      const activeFight = await prisma.fight.findFirst({
        where: { status: 'SCHEDULED' },
        orderBy: { createdAt: 'desc' },
      });
  
      if (!activeFight) return ctx.reply('No active scheduled fights.');
  
      const winner = await prisma.fighter.findUnique({ where: { telegramUsername: winnerUsername } });
      if (!winner) return ctx.reply('Winner fighter not found.');
  
      const loserId =
        winner.id === activeFight.fighter1Id ? activeFight.fighter2Id : activeFight.fighter1Id;
  
      await prisma.fight.update({
        where: { id: activeFight.id },
        data: {
          status: 'RESOLVED',
          winnerId: winner.id,
        },
      });
  
      await prisma.fighter.update({
        where: { id: winner.id },
        data: {
          wins: { increment: 1 },
        },
      });
  
      await prisma.fighter.update({
        where: { id: loserId },
        data: {
          losses: { increment: 1 },
        },
      });
  
      ctx.reply(`🏆 ${winner.name} has won the fight!`);
    } catch (err) {
      console.error(err);
      ctx.reply('❌ Failed to resolve fight.');
    }
  });

  
  bot.command('list_fights', async (ctx) => {
    try {
      const fights = await prisma.fight.findMany({
        where: { status: 'SCHEDULED' },
        include: {
          fighter1: true,
          fighter2: true,
        },
      });
  
      if (fights.length === 0) {
        return ctx.reply('There are no active fights.');
      }
  
      const messages = fights.map(
        (fight) =>
          `🥊 ${fight.fighter1.name} vs ${fight.fighter2.name} (ID: ${fight.id})`
      );
  
      ctx.reply(messages.join('\n'));
    } catch (err) {
      console.error(err);
      ctx.reply('❌ Failed to list fights.');
    }
  });
  

  bot.command('broadcast', async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply('❌ Only admins can broadcast.');
  
    const message = ctx.message.text.split(' ').slice(1).join(' ');
    if (!message) return ctx.reply('Usage: /broadcast <message>');
  
    try {
      const users = await prisma.user.findMany();
      for (const user of users) {
        try {
          await bot.telegram.sendMessage(user.telegramId.toString(), `📢 Announcement:\n${message}`);
        } catch (err) {
          console.error(`Failed to send to ${user.telegramId}`, err);
        }
      }
      ctx.reply('✅ Broadcast sent.');
    } catch (err) {
      console.error('Broadcast error:', err);
      ctx.reply('❌ Failed to broadcast.');
    }
  });
  

// Re-export everything properly
export { bot };
export default bot;