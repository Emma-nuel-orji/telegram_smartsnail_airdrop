import { Telegraf, Context } from 'telegraf';
import { PrismaClient } from '@prisma/client';
import { Update, CallbackQuery } from 'telegraf/typings/core/types/typegram';
import dotenv from 'dotenv';
dotenv.config(); 

const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in the environment variables.');
}

const bot = new Telegraf(botToken);
const prisma = new PrismaClient();

// List of admin user IDs
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS?.split(',')
  .map(id => Number(id.trim()))
  .filter(id => !isNaN(id)) || [];

  bot.telegram.setMyCommands([
    { command: 'schedule_fight', description: 'Schedule a new fight' },
    { command: 'resolve_fight', description: 'Resolve an existing fight' },
    { command: 'list_fights', description: 'List all active fights' }
  ]);

interface NewFight {
  title?: string;
  date?: string;
  fighter1Id?: string;
  fighter2Id?: string;
}

// Store fights being created in memory
const newFights: { [key: number]: NewFight } = {};

// Function to check if a user is an admin
function isAdmin(ctx: Context): boolean {
  const userId = ctx.from?.id;
  return userId !== undefined && ADMIN_USER_IDS.includes(userId);
}

// Middleware to check admin permissions
function requireAdmin(ctx: Context, next: () => Promise<void>) {
  if (!isAdmin(ctx)) {
    ctx.reply('You do not have permission to use this command.');
    return;
  }
  return next();
}

// Function to get all active fights
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

// Function to get a fight by ID
async function getFightById(fightId: string) {
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

// Function to declare a winner
async function declareWinner(fightId: string, winnerId: string) {
  try {
    return await prisma.fight.update({
      where: { id: fightId },
      data: { status: 'COMPLETED', winnerId },
    });
  } catch (error) {
    console.error(`Error declaring winner for fight ${fightId}:`, error);
    throw error;
  }
}

// Function to mark a fight as draw
async function markFightAsDraw(fightId: string) {
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

// Function to cancel a fight
async function cancelFight(fightId: string) {
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

// Command to schedule a new fight (admin only)
bot.command('schedule_fight', (ctx) => requireAdmin(ctx, async () => {
  const chatId = ctx.chat.id;
  newFights[chatId] = {};
  ctx.reply('Please enter the fight title:');
}));

// Command to resolve a fight (admin only)
bot.command('resolve_fight', (ctx) => requireAdmin(ctx, async () => {
  try {
    const chatId = ctx.chat.id;
    const fights = await getActiveFights();

    if (fights.length === 0) {
      ctx.reply('No active fights to resolve.');
      return;
    }

    const fightButtons = fights.map((fight) => [
      {
        text: `${fight.title}: ${fight.fighter1.name} vs ${fight.fighter2.name} on ${fight.fightDate.toISOString().slice(0, 16).replace('T', ' ')}`,
        callback_data: `manage_${fight.id}`,
      },
    ]);

    ctx.reply('Select a fight to resolve:', {
      reply_markup: { inline_keyboard: fightButtons },
    });
  } catch (error) {
    console.error('Error resolving fight:', error);
    ctx.reply('An error occurred while fetching active fights.');
  }
}));

// List active fights (available to all users)
bot.command('list_fights', async (ctx) => {
  try {
    const fights = await getActiveFights();
    
    if (fights.length === 0) {
      ctx.reply('No active fights scheduled.');
      return;
    }
    
    const fightsList = fights.map(fight => 
      `🥊 ${fight.title}:\n${fight.fighter1.name} vs ${fight.fighter2.name}\nDate: ${fight.fightDate.toISOString().slice(0, 16).replace('T', ' ')}`
    ).join('\n\n');
    
    ctx.reply(`Active fights:\n\n${fightsList}`);
  } catch (error) {
    console.error('Error listing fights:', error);
    ctx.reply('An error occurred while fetching active fights.');
  }
});

// Handling messages for scheduling fights
bot.on('message', async (ctx) => {
  // Make sure this is an admin
  if (!isAdmin(ctx)) return;
  
  // Check if it's a text message
  if (!ctx.message || !('text' in ctx.message)) return;
  
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  if (!newFights[chatId]) return;

  const currentFight = newFights[chatId];

  try {
    if (!currentFight.title) {
      currentFight.title = text;
      ctx.reply('Please enter the fight date and time (YYYY-MM-DD HH:MM):');
    } else if (!currentFight.date) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) {
        ctx.reply('Invalid date format. Please use YYYY-MM-DD HH:MM.');
        return;
      }
      
      // Validate that the date is in the future
      const fightDate = new Date(text);
      if (fightDate <= new Date()) {
        ctx.reply('Fight date must be in the future.');
        return;
      }
      
      currentFight.date = text;
      
      // Fetch fighters from database
      const fighters = await prisma.fighter.findMany();
      
      if (fighters.length < 2) {
        ctx.reply('Not enough fighters in the database. Please add fighters first.');
        delete newFights[chatId];
        return;
      }
      
      const fighterButtons = fighters.map((f) => [{ 
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

// Handling callback queries for fighter selection and fight management
bot.on('callback_query', async (ctx) => {
  // Type casting to access Telegraf's callback data
  const callbackQuery = ctx.callbackQuery as CallbackQuery.DataQuery;
  const callbackData = callbackQuery.data;
  if (!callbackData) return;
  
  // Check if user is admin for callback queries that modify data
  if (
    callbackData.startsWith('fighter1_') || 
    callbackData.startsWith('fighter2_') ||
    callbackData === 'confirm_fight' ||
    callbackData === 'cancel_creation' ||
    callbackData.startsWith('manage_') ||
    callbackData.startsWith('resolve_')
  ) {
    if (!isAdmin(ctx)) {
      await ctx.answerCbQuery('You do not have permission to perform this action.');
      return;
    }
  }
  
  // Get chatId from callbackQuery message
  const chatId = callbackQuery.message?.chat.id;
  if (!chatId) return;

  try {
    // Handle fighter selection during fight creation
    if (newFights[chatId]) {
      const currentFight = newFights[chatId];
      
      if (callbackData.startsWith('fighter1_')) {
        const fighter1Id = callbackData.split('_')[1];
        currentFight.fighter1Id = fighter1Id;
        
        // Get remaining fighters (excluding the one already selected)
        const fighters = await prisma.fighter.findMany({ 
          where: { id: { not: fighter1Id } } 
        });
        
        const fighterButtons = fighters.map((f) => [{ 
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
        
        // Confirm fight details before saving
        const fighter1 = await prisma.fighter.findUnique({ where: { id: currentFight.fighter1Id } });
        const fighter2 = await prisma.fighter.findUnique({ where: { id: currentFight.fighter2Id } });
        
        await ctx.answerCbQuery();
        ctx.reply(
          `Please confirm fight details:\n\nTitle: ${currentFight.title}\nDate: ${currentFight.date}\nFighter 1: ${fighter1?.name}\nFighter 2: ${fighter2?.name}`,
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Confirm', callback_data: 'confirm_fight' }],
                [{ text: 'Cancel', callback_data: 'cancel_creation' }]
              ]
            }
          }
        );
      } else if (callbackData === 'confirm_fight') {
        // Save the fight to database
        await prisma.fight.create({
          data: {
            title: currentFight.title!,
            fightDate: new Date(currentFight.date!),
            fighter1Id: currentFight.fighter1Id!,
            fighter2Id: currentFight.fighter2Id!,
            status: 'SCHEDULED'
          },
        });
        
        await ctx.answerCbQuery();
        ctx.reply('Fight scheduled successfully!');
        delete newFights[chatId];
      } else if (callbackData === 'cancel_creation') {
        await ctx.answerCbQuery();
        ctx.reply('Fight creation cancelled.');
        delete newFights[chatId];
      }
    }
    
    // Handle fight management
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
    } else if (callbackData.startsWith('resolve_')) {
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
          // This handles the case where the callback data is just resolve_fightId
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
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    await ctx.answerCbQuery();
    ctx.reply('An error occurred while processing your request.');
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Bot error for ${ctx.updateType}`, err);
  ctx.reply('An error occurred while processing your request.');
});

// Start the bot
bot.launch().then(() => {
  console.log('Bot started successfully');
}).catch(err => {
  console.error('Failed to start bot:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));