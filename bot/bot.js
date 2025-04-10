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
bot.use(session());


bot.start(async (ctx) => {
    const userId = ctx.from?.id;
    const startPayload = ctx.message?.text.split(' ')[1]; // Referral ID (referrer)
  
    console.log(`New user started: ${userId}, Referral: ${startPayload}`);
  
    // 🟢 First request: Create or update user
    await fetch(`${API_BASE_URL}/api/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramId: userId,
        firstName: ctx.from?.first_name || '',
        lastName: ctx.from?.last_name || '',
        username: ctx.from?.username || '',
      }),
    });
  
    // 🟢 Second request: Save referral (only if referral exists)
    if (startPayload) {
      await fetch(`${API_BASE_URL}/api/referrals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userTelegramId: userId, // New user
          referrerTelegramId: startPayload, // Referrer
        }),
      });
  
      ctx.reply(`You joined with a referral: ${startPayload}! 🎉 Your referrer will be rewarded.`);
    }
  
    ctx.reply(`Welcome, ${ctx.from.first_name}! 🎉`);
  });
  

// Middleware to log updates
bot.use((ctx, next) => {
    console.log('Received update:', ctx.update);
    return next();
});

// Ping command
bot.command('ping', (ctx) => {
    console.log('Ping command received');
    ctx.reply('Pong! Bot is alive.');
});

// Get bot info
bot.telegram.getMe().then((botInfo) => {
    console.log('Connected to bot:', botInfo.username);
}).catch((error) => {
    console.error('Failed to connect to Telegram:', error);
});

// Admin user IDs
const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS?.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id))) || [];

// Set bot commands
bot.telegram.setMyCommands([
    { command: 'schedule_fight', description: 'Schedule a new fight' },
    { command: 'resolve_fight', description: 'Resolve an existing fight' },
    { command: 'list_fights', description: 'List all active fights' }
]);

// Store fights being created in memory
const newFights = {};

// Check if a user is an admin
function isAdmin(ctx) {
    const userId = ctx.from?.id;
    return userId !== undefined && ADMIN_USER_IDS.includes(userId);
}

// Middleware to check admin permissions
function requireAdmin(ctx, next) {
    if (!isAdmin(ctx)) {
        ctx.reply('You do not have permission to use this command.');
        return;
    }
    return next();
}

// Get all active fights
async function getActiveFights() {
    try {
        return await prisma.fight.findMany({
            where: { status: 'SCHEDULED' },
            include: { fighter1: true, fighter2: true },
        });
    } catch (error) {
        console.error('Error fetching active fights:', error);
        return [];
    }
}

// Get a fight by ID
async function getFightById(fightId) {
    try {
        return await prisma.fight.findUnique({
            where: { id: fightId },
            include: { fighter1: true, fighter2: true },
        });
    } catch (error) {
        console.error(`Error fetching fight ${fightId}:`, error);
        return null;
    }
}

// Declare a winner
async function declareWinner(fightId, winnerId) {
    try {
        return await prisma.fight.update({
            where: { id: fightId },
            data: { status: 'COMPLETED', winnerId: winnerId },
        });
    } catch (error) {
        console.error(`Error declaring winner for fight ${fightId}:`, error);
        throw error;
    }
}

// Mark a fight as a draw
async function markFightAsDraw(fightId) {
    try {
        return await prisma.fight.update({
            where: { id: fightId },
            data: { status: 'DRAW' },
        });
    } catch (error) {
        console.error(`Error marking fight ${fightId} as draw:`, error);
        throw error;
    }
}

// Cancel a fight
async function cancelFight(fightId) {
    try {
        return await prisma.fight.update({
            where: { id: fightId },
            data: { status: 'CANCELLED' },
        });
    } catch (error) {
        console.error(`Error cancelling fight ${fightId}:`, error);
        throw error;
    }
}

// Schedule a new fight (admin only)
bot.command('schedule_fight', (ctx) => requireAdmin(ctx, async () => {
    const chatId = ctx.chat?.id;
    if (chatId) {
        newFights[chatId] = {};
        ctx.reply('Please enter the fight title:');
    }
}));

// Resolve a fight (admin only)
bot.command('resolve_fight', (ctx) => requireAdmin(ctx, async () => {
    try {
        const chatId = ctx.chat?.id;
        const fights = await getActiveFights();
        if (fights.length === 0) {
            ctx.reply('No active fights to resolve.');
            return;
        }
        const fightButtons = fights.map(fight => [{
            text: `${fight.title}: ${fight.fighter1.name} vs ${fight.fighter2.name} on ${fight.fightDate.toISOString().slice(0, 16).replace('T', ' ')}`,
            callback_data: `manage_${fight.id}`,
        }]);
        ctx.reply('Select a fight to resolve:', {
            reply_markup: { inline_keyboard: fightButtons },
        });
    } catch (error) {
        console.error('Error resolving fight:', error);
        ctx.reply('An error occurred while fetching active fights.');
    }
}));

function isDataCallbackQuery(callbackQuery) {
    return callbackQuery && 'data' in callbackQuery;
  }

  bot.command('addfighter', (ctx) => {
    ctx.reply('Please provide the fighter details in the following format:\n\n' +
      'Name, Age (years), Height (_ft_in), Weight (kg), Fighting Weight (kg), Telegram ID\n\n' +
      'Example: "John Doe, 28, 5ft 8in, 86, 80, 123456789"');
    ctx.session = { step: 'awaiting_details' };
  });;
  
  async function saveFighterToDatabase(fighterData) {
    try {
      // Ensure telegramId is provided
      if (!fighterData.telegramId) {
        throw new Error('Telegram ID is required to create a fighter.');
      }
      
      // Check if a fighter with this telegramId already exists
      const existingFighter = await prisma.fighter.findUnique({
        where: { telegramId: fighterData.telegramId }
      });
      
      if (existingFighter) {
        throw new Error(`A fighter with Telegram ID ${fighterData.telegramId} already exists.`);
      }
      
      return await prisma.fighter.create({
        data: {
          name: fighterData.name,
          age: fighterData.age,
          height: fighterData.height,
          weight: fighterData.weight,
          fightingWeight: fighterData.fightingWeight,
          imageUrl: fighterData.imageUrl,
          telegramId: fighterData.telegramId
        }
      });
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target === 'Fighter_telegramId_key') {
        console.error('Duplicate telegramId error:', error);
        throw new Error(`A fighter with Telegram ID ${fighterData.telegramId} already exists. Please use a different Telegram ID.`);
      } else {
        console.error('Error saving fighter to database:', error);
        throw error;
      }
    }
  }
  
  
  
  bot.on('text', async (ctx) => {
    // Skip if not in a recognized step
    if (!ctx.session || !ctx.session.step) return;
    
    if (ctx.session.step === 'awaiting_details') {
      const details = ctx.message.text.split(',').map(item => item.trim());
      if (details.length < 6) {
        return ctx.reply('Please provide all the required details:\n' +
          'Name, Age (years), Height (_ft_in), Weight (kg), Fighting Weight (kg), Telegram ID');
      }
    
      const [name, age, height, weight, fightingWeight, telegramId] = details;
      
      // Validate numeric inputs
      const ageNum = parseInt(age, 10);
      const heightNum = parseFloat(height);
      const weightNum = parseFloat(weight);
      const fightingWeightNum = parseFloat(fightingWeight);
      
      if (isNaN(ageNum) || isNaN(weightNum) || isNaN(fightingWeightNum)) {
        return ctx.reply('Please provide valid numeric values for age, weight, and fighting weight.');
      }
      
      // Check if telegramId is provided
      if (!telegramId || telegramId.trim() === '') {
        return ctx.reply('Telegram ID is required. Please provide a valid Telegram ID.');
      }
      
      ctx.session.fighterData = {
        name,
        age: ageNum,
        height: heightNum,
        weight: weightNum,
        fightingWeight: fightingWeightNum,
        telegramId: telegramId.trim()
      };
      
      ctx.session.step = 'awaiting_image';
      return ctx.reply('Please send the fighter\'s image that shows their full face.');
    }
  });
  
  // Make sure the photo handler is properly implemented
  bot.on('photo', async (ctx) => {
    if (ctx.session?.step === 'awaiting_image') {
      const photo = ctx.message.photo.pop(); // Get the highest resolution photo
      
      try {
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);
        ctx.session.fighterData.imageUrl = fileLink.href;
    
        // Save fighter to the database
        const newFighter = await saveFighterToDatabase(ctx.session.fighterData);
        ctx.reply(`Fighter ${newFighter.name} has been added successfully!\n\n` +
          `Name: ${newFighter.name}\n` +
          `Age: ${newFighter.age} years\n` +
          `Height: ${newFighter.height} _ft_in\n` +
          `Weight: ${newFighter.weight} kg\n` +
          `Fighting Weight: ${newFighter.fightingWeight} kg`);
        
        // Clear session
        ctx.session = {};
      } catch (error) {
        console.error('Error saving fighter:', error);
        ctx.reply('There was an error saving the fighter. Please try again.\n\n' +
          'If the error persists, the fighter name might already exist in the database.');
      }
    }
  });

// List active fights (available to all users)
bot.command('list_fights', async (ctx) => {
    try {
        const fights = await getActiveFights();
        if (fights.length === 0) {
            ctx.reply('No active fights scheduled.');
            return;
        }
        const fightsList = fights.map(fight => {
            return `🥊 ${fight.title}:\n${fight.fighter1.name} vs ${fight.fighter2.name}\nDate: ${fight.fightDate.toISOString().slice(0, 16).replace('T', ' ')}`;
        }).join('\n\n');
        ctx.reply(`Active fights:\n\n${fightsList}`);
    } catch (error) {
        console.error('Error listing fights:', error);
        ctx.reply('An error occurred while fetching active fights.');
    }
});

// Type guard for text messages
function isTextMessage(msg) {
    return msg && 'text' in msg;
}

// Handle messages for scheduling fights
bot.on('message', async (ctx) => {
    console.log('Message received:', ctx.message);
    console.log('Chat ID:', ctx.chat?.id);
    
    // Skip if not admin
    if (!isAdmin(ctx)) {
        console.log('User is not admin, skipping message handler');
        return;
    }
    
    // Skip if not text message
    if (!isTextMessage(ctx.message)) {
        console.log('Not a text message, skipping');
        return;
    }
    
    const chatId = ctx.chat?.id;
    if (!chatId) {
        console.log('No chat ID found, skipping');
        return;
    }
    
    console.log('newFights state:', newFights);
    console.log('newFights for this chat:', newFights[chatId]);
    
    // Skip if not creating a fight
    if (!newFights[chatId]) {
        console.log('No fight being created for this chat, skipping');
        return;
    }
    
    const text = ctx.message.text;
    console.log('Processing text message:', text);
    
    const currentFight = newFights[chatId];
    console.log('Current fight state:', currentFight);

    try {
        if (!currentFight.title) {
            console.log('Setting fight title to:', text);
            currentFight.title = text;
            ctx.reply('Please enter the fight date and time (YYYY-MM-DD HH:MM):');
        } else if (!currentFight.date) {
            console.log('Processing date input:', text);
            if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) {
                console.log('Invalid date format');
                ctx.reply('Invalid date format. Please use YYYY-MM-DD HH:MM.');
                return;
            }
            const fightDate = new Date(text);
            if (fightDate <= new Date()) {
                console.log('Fight date is in the past');
                ctx.reply('Fight date must be in the future.');
                return;
            }
            console.log('Setting fight date to:', text);
            currentFight.date = text;
            
            console.log('Fetching fighters from database');
            const fighters = await prisma.fighter.findMany();
            if (fighters.length < 2) {
                console.log('Not enough fighters in database');
                ctx.reply('Not enough fighters in the database. Please add fighters first.');
                delete newFights[chatId];
                return;
            }
            
            console.log('Creating fighter selection buttons');
            const fighterButtons = fighters.map(f => [{
                text: f.name,
                callback_data: `fighter1_${f.id}`
            }]);
            ctx.reply('Please select Fighter 1:', {
                reply_markup: { inline_keyboard: fighterButtons },
            });
        }
    } catch (error) {
        console.error('Error processing message:', error);
        ctx.reply('An error occurred while processing your request.');
        delete newFights[chatId];
    }
});

// Handle callback queries
bot.on('callback_query', async (ctx) => {
    if (!isDataCallbackQuery(ctx.callbackQuery)) return;

    const callbackData = ctx.callbackQuery.data;
    if (!callbackData) return;

    if (callbackData.startsWith('fighter1_') ||
        callbackData.startsWith('fighter2_') ||
        callbackData === 'confirm_fight' ||
        callbackData === 'cancel_creation' ||
        callbackData.startsWith('manage_') ||
        callbackData.startsWith('resolve_')) {
        if (!isAdmin(ctx)) {
            await ctx.answerCbQuery('You do not have permission to perform this action.');
            return;
        }
    }

    const chatId = ctx.callbackQuery.message?.chat.id;
    if (!chatId) return;

    try {
        if (newFights[chatId]) {
            const currentFight = newFights[chatId];

            if (callbackData.startsWith('fighter1_')) {
                const fighter1Id = callbackData.split('_')[1];
                currentFight.fighter1Id = fighter1Id;
                const fighters = await prisma.fighter.findMany({
                    where: { id: { not: fighter1Id } }
                });
                const fighterButtons = fighters.map(f => [{
                    text: f.name,
                    callback_data: `fighter2_${f.id}`
                }]);
                await ctx.answerCbQuery();
                ctx.reply('Please select Fighter 2:', {
                    reply_markup: { inline_keyboard: fighterButtons },
                });
            } else if (callbackData.startsWith('fighter2_')) {
                const fighter2Id = callbackData.split('_')[1];
                currentFight.fighter2Id = fighter2Id;
                const fighter1 = await prisma.fighter.findUnique({
                    where: { id: currentFight.fighter1Id }
                });
                const fighter2 = await prisma.fighter.findUnique({
                    where: { id: currentFight.fighter2Id }
                });
                await ctx.answerCbQuery();
                ctx.reply(`Please confirm fight details:\n\nTitle: ${currentFight.title}\nDate: ${currentFight.date}\nFighter 1: ${fighter1?.name}\nFighter 2: ${fighter2?.name}`, {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: 'Confirm', callback_data: 'confirm_fight' }],
                            [{ text: 'Cancel', callback_data: 'cancel_creation' }]
                        ]
                    }
                });
            } else if (callbackData === 'confirm_fight') {
                if (currentFight.title && currentFight.date && currentFight.fighter1Id && currentFight.fighter2Id) {
                    await prisma.fight.create({
                        data: {
                            title: currentFight.title,
                            fightDate: new Date(currentFight.date),
                            fighter1Id: currentFight.fighter1Id,
                            fighter2Id: currentFight.fighter2Id,
                            status: 'SCHEDULED'
                        },
                    });
                    await ctx.answerCbQuery();
                    ctx.reply('Fight scheduled successfully!');
                    delete newFights[chatId];
                } else {
                    await ctx.answerCbQuery();
                    ctx.reply('Missing fight details. Please try again.');
                }
            } else if (callbackData === 'cancel_creation') {
                await ctx.answerCbQuery();
                ctx.reply('Fight creation cancelled.');
                delete newFights[chatId];
            }
        }

        if (callbackData.startsWith('manage_')) {
            const fightId = callbackData.split('_')[1];
            const fight = await getFightById(fightId);
            if (!fight) {
                await ctx.answerCbQuery();
                ctx.reply('Fight not found.');
                return;
            }
            const actionButtons = [
                [{ text: `${fight.fighter1.name} won`, callback_data: `resolve_${fight.id}_fighter1` }],
                [{ text: `${fight.fighter2.name} won`, callback_data: `resolve_${fight.id}_fighter2` }],
                [{ text: 'Draw', callback_data: `resolve_${fight.id}_draw` }],
                [{ text: 'Cancel Fight', callback_data: `resolve_${fight.id}_cancel` }],
            ];
            await ctx.answerCbQuery();
            ctx.reply(`Managing Fight: ${fight.title}`, {
                reply_markup: { inline_keyboard: actionButtons },
            });
        }

        if (callbackData.startsWith('resolve_')) {
            const parts = callbackData.split('_');
            const fightId = parts[1];
            const action = parts[2];
            const fight = await getFightById(fightId);
            if (!fight) {
                await ctx.answerCbQuery();
                ctx.reply('Fight not found.');
                return;
            }

            switch (action) {
                case 'fighter1':
                    await declareWinner(fightId, fight.fighter1Id);
                    await ctx.answerCbQuery();
                    ctx.reply(`${fight.fighter1.name} has been declared the winner!`);
                    break;
                case 'fighter2':
                    await declareWinner(fightId, fight.fighter2Id);
                    await ctx.answerCbQuery();
                    ctx.reply(`${fight.fighter2.name} has been declared the winner!`);
                    break;
                case 'draw':
                    await markFightAsDraw(fightId);
                    await ctx.answerCbQuery();
                    ctx.reply('Fight has been marked as a draw.');
                    break;
                case 'cancel':
                    await cancelFight(fightId);
                    await ctx.answerCbQuery();
                    ctx.reply('Fight has been cancelled.');
                    break;
                default:
                    const actionButtons = [
                        [{ text: `${fight.fighter1.name} won`, callback_data: `resolve_${fight.id}_fighter1` }],
                        [{ text: `${fight.fighter2.name} won`, callback_data: `resolve_${fight.id}_fighter2` }],
                        [{ text: 'Draw', callback_data: `resolve_${fight.id}_draw` }],
                        [{ text: 'Cancel Fight', callback_data: `resolve_${fight.id}_cancel` }],
                    ];
                    await ctx.answerCbQuery();
                    ctx.reply(`Managing Fight: ${fight.title}`, {
                        reply_markup: { inline_keyboard: actionButtons },
                    });
                    break;
            }
        }
    } catch (error) {
        console.error('Error handling callback query:', error);
        await ctx.answerCbQuery();
        ctx.reply('An error occurred while processing your request.');
    }
});

// // Error handling
// bot.catch((err, ctx) => {
//     console.error(`Bot error for ${ctx.updateType}`, err);
//     ctx.reply('An error occurred while processing your request.');
// });


// Wrap your handlers in try-catch blocks
bot.command('ping', async (ctx) => {
    try {
        console.log('Ping command received');
        await ctx.reply('Pong! Bot is alive.');
    } catch (error) {
        console.error('Error in ping command:', error);
        // Try to notify about the error but don't throw
        try {
            await ctx.reply('Sorry, there was an error processing your command.');
        } catch (replyError) {
            console.error('Could not send error message:', replyError);
        }
    }
});

// Add a global error handler
bot.catch((err, ctx) => {
    console.error(`Error in bot update ${ctx.updateType}:`, err);
    // Log detailed information
    console.error('Update object:', JSON.stringify(ctx.update, null, 2));
    
    // Try to notify the user
    try {
        ctx.reply('Sorry, an error occurred while processing your request. The error has been logged.');
    } catch (replyError) {
        console.error('Failed to send error message:', replyError);
    }
});

// Add process-level error handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    // Don't exit the process
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Don't exit the process
});


// Start the bot
bot.launch().then(() => {
    console.log('Bot started successfully');
}).catch((err) => {
    console.error('Failed to start bot:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

export { bot };
export default bot;