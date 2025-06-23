import { Telegraf, Markup } from 'telegraf';
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

// Start command with proper BigInt handling for telegramId
bot.start(async (ctx) => {
    try {
        const userId = ctx.from?.id;
        const startPayload = ctx.startPayload;
        
        console.log(`New user started: ${userId}, Referral payload: ${startPayload}`); 
        
        // Create or update user
        try {
            const userResponse = await fetch(`${API_BASE_URL}/api/user`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    telegramId: userId.toString(),
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
                
                const referrerId = startPayload.trim();
                
                if (!/^\d+$/.test(referrerId)) {
                    console.error(`Invalid referrer ID: ${startPayload}`);
                    ctx.reply('Invalid referral link. Please try again with a valid referral.');
                    return;
                }
                
                const referralResponse = await fetch(`${API_BASE_URL}/api/referrals`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userTelegramId: userId.toString(),
                        referrerTelegramId: referrerId,
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
                      url: "https://t.me/SmartSnails_Bot/app",
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

// Admin configurations - separate fight and restaurant admins
const FIGHT_ADMIN_IDS = (process.env.FIGHT_ADMIN_IDS?.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id))) || [];
const RESTAURANT_ADMIN_IDS = (process.env.RESTAURANT_ADMIN_IDS?.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id))) || [];
const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS?.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id))) || [];

// Set bot commands - This ensures they appear in the Telegram menu
bot.telegram.setMyCommands([
    { command: 'ping', description: 'Check if bot is alive' },
    // Fight commands
    { command: 'schedule_fight', description: 'Schedule a new fight (Fight Admin)' },
    { command: 'resolve_fight', description: 'Resolve an existing fight (Fight Admin)' },
    { command: 'list_fights', description: 'List all active fights' },
    { command: 'addfighter', description: 'Add a new fighter (Fight Admin)' },
    // Restaurant commands
    { command: 'add_menu_item', description: 'Add a new menu item (Restaurant Admin)' },
    { command: 'list_menu', description: 'List all menu items' },
    { command: 'edit_menu_item', description: 'Edit a menu item (Restaurant Admin)' },
    { command: 'delete_menu_item', description: 'Delete a menu item (Restaurant Admin)' },
    // Super admin commands
    { command: 'broadcast', description: 'Broadcast message (Super Admin)' }
]).catch(error => {
    console.error('Failed to set commands:', error);
});

// Store fights and menu items being created/edited in memory
const newFights = {};
const menuItemCreation = {};

// Permission checking functions
function isFightAdmin(ctx) {
    const userId = ctx.from?.id;
    return userId !== undefined && (FIGHT_ADMIN_IDS.includes(userId) || SUPER_ADMIN_IDS.includes(userId));
}

function isRestaurantAdmin(ctx) {
    const userId = ctx.from?.id;
    return userId !== undefined && (RESTAURANT_ADMIN_IDS.includes(userId) || SUPER_ADMIN_IDS.includes(userId));
}

function isSuperAdmin(ctx) {
    const userId = ctx.from?.id;
    return userId !== undefined && SUPER_ADMIN_IDS.includes(userId);
}

// Middleware to check permissions
function requireFightAdmin(ctx, next) {
    if (!isFightAdmin(ctx)) {
        ctx.reply('❌ You do not have permission to use this command. This is for fight administrators only.');
        return;
    }
    return next();
}

function requireRestaurantAdmin(ctx, next) {
    if (!isRestaurantAdmin(ctx)) {
        ctx.reply('❌ You do not have permission to use this command. This is for restaurant administrators only.');
        return;
    }
    return next();
}

function requireSuperAdmin(ctx, next) {
    if (!isSuperAdmin(ctx)) {
        ctx.reply('❌ You do not have permission to use this command. This is for super administrators only.');
        return;
    }
    return next();
}

// ======================
// RESTAURANT MENU COMMANDS
// ======================

// Add new menu item command
bot.command('add_menu_item', (ctx) => requireRestaurantAdmin(ctx, async () => {
    const chatId = ctx.chat?.id;
    if (chatId) {
        menuItemCreation[chatId] = { step: 'name' };
        ctx.reply('🍽️ Let\'s add a new menu item!\n\nPlease enter the item name:');
    }
}));

// List all menu items
bot.command('list_menu', async (ctx) => {
    try {
        const menuItems = await prisma.service.findMany({
            where: { type: 'ONE_TIME' },
            orderBy: { createdAt: 'desc' }
        });

        if (menuItems.length === 0) {
            ctx.reply('📋 No menu items found.');
            return;
        }

        let message = '🍽️ **Current Menu Items:**\n\n';
        menuItems.forEach((item, index) => {
            message += `${index + 1}. **${item.name}**\n`;
            message += `   💰 Price: ${item.priceShells} Shells\n`;
            message += `   📅 Added: ${item.createdAt.toLocaleDateString()}\n\n`;
        });

        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error listing menu items:', error);
        ctx.reply('❌ An error occurred while fetching menu items.');
    }
});

// Edit menu item command
bot.command('edit_menu_item', (ctx) => requireRestaurantAdmin(ctx, async () => {
    try {
        const menuItems = await prisma.service.findMany({
            where: { type: 'ONE_TIME' },
            orderBy: { name: 'asc' }
        });

        if (menuItems.length === 0) {
            ctx.reply('📋 No menu items to edit.');
            return;
        }

        const buttons = menuItems.map(item => [{
            text: `${item.name} (${item.priceShells} Shells)`,
            callback_data: `edit_menu:${item.id}`
        }]);

        ctx.reply('📝 Select a menu item to edit:', {
            reply_markup: { inline_keyboard: buttons }
        });
    } catch (error) {
        console.error('Error fetching menu items for editing:', error);
        ctx.reply('❌ An error occurred while fetching menu items.');
    }
}));

// Delete menu item command
bot.command('delete_menu_item', (ctx) => requireRestaurantAdmin(ctx, async () => {
    try {
        const menuItems = await prisma.service.findMany({
            where: { type: 'ONE_TIME' },
            orderBy: { name: 'asc' }
        });

        if (menuItems.length === 0) {
            ctx.reply('📋 No menu items to delete.');
            return;
        }

        const buttons = menuItems.map(item => [{
            text: `❌ ${item.name} (${item.priceShells} Shells)`,
            callback_data: `delete_menu:${item.id}`
        }]);

        ctx.reply('🗑️ Select a menu item to delete:', {
            reply_markup: { inline_keyboard: buttons }
        });
    } catch (error) {
        console.error('Error fetching menu items for deletion:', error);
        ctx.reply('❌ An error occurred while fetching menu items.');
    }
}));

// ======================
// EXISTING FIGHT COMMANDS (with permission checks)
// ======================

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

// Helper to update fight result
async function resolveFight(fightId, status, winnerId) {
    const data = { status };
    if (winnerId !== undefined) {
        data.winnerId = winnerId;
    }

    try {
        return await prisma.fight.update({
            where: { id: fightId },
            data,
        });
    } catch (error) {
        console.error(`Error updating fight ${fightId}:`, error);
        throw error;
    }
}

// Schedule a new fight (fight admin only)
bot.command('schedule_fight', (ctx) => requireFightAdmin(ctx, async () => {
    const chatId = ctx.chat?.id;
    if (chatId) {
        newFights[chatId] = {};
        ctx.reply('🥊 Let\'s schedule a new fight!\n\nPlease enter the fight title:');
    }
}));

// Add fighter command (fight admin only)
bot.command('addfighter', (ctx) => requireFightAdmin(ctx, async () => {
    ctx.reply('👤 Please provide the fighter details in the following format:\n\n' +
        'Name, Age (years), Height (_ft_in), Weight (kg), Fighting Weight (kg), Telegram ID\n\n' +
        'Example: "John Doe, 28, 5ft 8in, 86, 80, 123456789"');
    ctx.session = { step: 'awaiting_details' };
}));

// Save fighter to database
async function saveFighterToDatabase(fighterData) {
    try {
        if (!fighterData.telegramId) {
            throw new Error('Telegram ID is required to create a fighter.');
        }
        
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

// List active fights (available to all users)
bot.command('list_fights', async (ctx) => {
    try {
        const fights = await getActiveFights();
        if (fights.length === 0) {
            ctx.reply('🥊 No active fights scheduled.');
            return;
        }
        const fightsList = fights.map(fight => {
            return `🥊 ${fight.title}:\n${fight.fighter1.name} vs ${fight.fighter2.name}\nDate: ${fight.fightDate.toISOString().slice(0, 16).replace('T', ' ')}`;
        }).join('\n\n');
        ctx.reply(`Active fights:\n\n${fightsList}`);
    } catch (error) {
        console.error('Error listing fights:', error);
        ctx.reply('❌ An error occurred while fetching active fights.');
    }
});

// Broadcast command (super admin only)
bot.command('broadcast', (ctx) => requireSuperAdmin(ctx, async () => {
    const message = ctx.message.text.split(' ').slice(1).join(' ');
    if (!message) return ctx.reply('Usage: /broadcast <message>');

    try {
        const users = await prisma.user.findMany();
        let sentCount = 0;
        let failedCount = 0;

        for (const user of users) {
            try {
                await bot.telegram.sendMessage(user.telegramId.toString(), `📢 Announcement:\n${message}`);
                sentCount++;
            } catch (err) {
                console.error(`Failed to send to ${user.telegramId}`, err);
                failedCount++;
            }
        }
        ctx.reply(`✅ Broadcast completed!\n📤 Sent: ${sentCount}\n❌ Failed: ${failedCount}`);
    } catch (err) {
        console.error('Broadcast error:', err);
        ctx.reply('❌ Failed to broadcast message.');
    }
}));

// ======================
// MESSAGE HANDLERS
// ======================

// Type guard for text messages
function isTextMessage(msg) {
    return msg && 'text' in msg;
}

// Handle text messages for both fight scheduling and menu item creation
bot.on('text', async (ctx) => {
    const chatId = ctx.chat?.id;
    const text = ctx.message.text;

    // Handle fighter addition (existing code)
    if (ctx.session?.step === 'awaiting_details') {
        const details = ctx.message.text.split(',').map(item => item.trim());
        if (details.length < 6) {
            return ctx.reply('Please provide all the required details:\n' +
                'Name, Age (years), Height (_ft_in), Weight (kg), Fighting Weight (kg), Telegram ID');
        }

        const [name, age, height, weight, fightingWeight, telegramId] = details;
        
        const ageNum = parseInt(age, 10);
        const heightNum = parseFloat(height);
        const weightNum = parseFloat(weight);
        const fightingWeightNum = parseFloat(fightingWeight);
        
        if (isNaN(ageNum) || isNaN(weightNum) || isNaN(fightingWeightNum)) {
            return ctx.reply('Please provide valid numeric values for age, weight, and fighting weight.');
        }
        
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

    // Handle menu item creation
    if (menuItemCreation[chatId]) {
        const menuItem = menuItemCreation[chatId];
        
        if (menuItem.step === 'name') {
            menuItem.name = text;
            menuItem.step = 'price';
            ctx.reply('💰 Great! Now enter the price in Shells (numbers only):');
        } else if (menuItem.step === 'price') {
            const price = parseInt(text, 10);
            if (isNaN(price) || price <= 0) {
                ctx.reply('❌ Please enter a valid positive number for the price.');
                return;
            }
            
            try {
                const newMenuItem = await prisma.service.create({
                    data: {
                        name: menuItem.name,
                        priceShells: price,
                        type: 'ONE_TIME'
                    }
                });
                
                ctx.reply(`✅ Menu item added successfully!\n\n🍽️ **${newMenuItem.name}**\n💰 Price: ${newMenuItem.priceShells} Shells`);
                delete menuItemCreation[chatId];
            } catch (error) {
                console.error('Error creating menu item:', error);
                ctx.reply('❌ An error occurred while adding the menu item. Please try again.');
                delete menuItemCreation[chatId];
            }
        }
        return;
    }

    // Handle fight scheduling (existing code with permission check)
    if (newFights[chatId] && isFightAdmin(ctx)) {
        const currentFight = newFights[chatId];

        try {
            if (!currentFight.title) {
                currentFight.title = text;
                ctx.reply('📅 Please enter the fight date and time (YYYY-MM-DD HH:MM):');
            } else if (!currentFight.date) {
                if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) {
                    ctx.reply('❌ Invalid date format. Please use YYYY-MM-DD HH:MM.');
                    return;
                }
                const fightDate = new Date(text);
                if (fightDate <= new Date()) {
                    ctx.reply('❌ Fight date must be in the future.');
                    return;
                }
                currentFight.date = text;
                
                const fighters = await prisma.fighter.findMany();
                if (fighters.length < 2) {
                    ctx.reply('❌ Not enough fighters in the database. Please add fighters first.');
                    delete newFights[chatId];
                    return;
                }
                
                const fighterButtons = fighters.map(f => [{
                    text: f.name,
                    callback_data: `fighter1_${f.id}`
                }]);
                ctx.reply('👤 Please select Fighter 1:', {
                    reply_markup: { inline_keyboard: fighterButtons },
                });
            }
        } catch (error) {
            console.error('Error processing fight message:', error);
            ctx.reply('❌ An error occurred while processing your request.');
            delete newFights[chatId];
        }
    }
});

// Handle photo uploads for fighter creation
bot.on('photo', async (ctx) => {
    if (ctx.session?.step === 'awaiting_image') {
        const photo = ctx.message.photo.pop();
        
        try {
            const fileLink = await ctx.telegram.getFileLink(photo.file_id);
            ctx.session.fighterData.imageUrl = fileLink.href;

            const newFighter = await saveFighterToDatabase(ctx.session.fighterData);
            ctx.reply(`✅ Fighter ${newFighter.name} has been added successfully!\n\n` +
                `👤 Name: ${newFighter.name}\n` +
                `🎂 Age: ${newFighter.age} years\n` +
                `📏 Height: ${newFighter.height} _ft_in\n` +
                `⚖️ Weight: ${newFighter.weight} kg\n` +
                `🥊 Fighting Weight: ${newFighter.fightingWeight} kg`);
            
            ctx.session = {};
        } catch (error) {
            console.error('Error saving fighter:', error);
            ctx.reply('❌ There was an error saving the fighter. Please try again.\n\n' +
                'If the error persists, the fighter name might already exist in the database.');
        }
    }
});

// ======================
// CALLBACK QUERY HANDLERS
// ======================

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    if (!data) return;

    try {
        // Handle menu item editing
        if (data.startsWith('edit_menu:')) {
            if (!isRestaurantAdmin(ctx)) {
                await ctx.answerCbQuery('❌ You do not have permission to edit menu items.');
                return;
            }

            const itemId = data.split(':')[1];
            const menuItem = await prisma.service.findUnique({
                where: { id: itemId }
            });

            if (!menuItem) {
                await ctx.answerCbQuery('❌ Menu item not found.');
                return;
            }

            const buttons = [
                [{ text: '📝 Edit Name', callback_data: `edit_name:${itemId}` }],
                [{ text: '💰 Edit Price', callback_data: `edit_price:${itemId}` }],
                [{ text: '❌ Cancel', callback_data: 'cancel_edit' }]
            ];

            await ctx.editMessageText(
                `📝 **Edit Menu Item**\n\n🍽️ **Current Name:** ${menuItem.name}\n💰 **Current Price:** ${menuItem.priceShells} Shells\n\nWhat would you like to edit?`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: buttons }
                }
            );
        }

        // Handle name editing
        else if (data.startsWith('edit_name:')) {
            const itemId = data.split(':')[1];
            const chatId = ctx.chat?.id;
            if (chatId) {
                menuItemCreation[chatId] = { step: 'edit_name', itemId };
                await ctx.editMessageText('📝 Please enter the new name for this menu item:');
            }
        }

        // Handle price editing
        else if (data.startsWith('edit_price:')) {
            const itemId = data.split(':')[1];
            const chatId = ctx.chat?.id;
            if (chatId) {
                menuItemCreation[chatId] = { step: 'edit_price', itemId };
                await ctx.editMessageText('💰 Please enter the new price in Shells (numbers only):');
            }
        }

        // Handle menu item deletion
        else if (data.startsWith('delete_menu:')) {
            if (!isRestaurantAdmin(ctx)) {
                await ctx.answerCbQuery('❌ You do not have permission to delete menu items.');
                return;
            }

            const itemId = data.split(':')[1];
            const menuItem = await prisma.service.findUnique({
                where: { id: itemId }
            });

            if (!menuItem) {
                await ctx.answerCbQuery('❌ Menu item not found.');
                return;
            }

            const buttons = [
                [
                    { text: '✅ Yes, Delete', callback_data: `confirm_delete:${itemId}` },
                    { text: '❌ Cancel', callback_data: 'cancel_delete' }
                ]
            ];

            await ctx.editMessageText(
                `⚠️ **Confirm Deletion**\n\nAre you sure you want to delete:\n🍽️ **${menuItem.name}** (${menuItem.priceShells} Shells)?\n\n**This action cannot be undone!**`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: { inline_keyboard: buttons }
                }
            );
        }

        // Confirm deletion
        else if (data.startsWith('confirm_delete:')) {
            const itemId = data.split(':')[1];
            
            try {
                const deletedItem = await prisma.service.delete({
                    where: { id: itemId }
                });
                
                await ctx.editMessageText(`✅ **Menu item deleted successfully!**\n\n🗑️ Deleted: **${deletedItem.name}**`);
            } catch (error) {
                console.error('Error deleting menu item:', error);
                await ctx.editMessageText('❌ An error occurred while deleting the menu item.');
            }
        }

        // Cancel operations
        else if (data === 'cancel_edit' || data === 'cancel_delete') {
            await ctx.editMessageText('❌ Operation cancelled.');
        }

        // Handle existing fight-related callbacks (existing code)
        // ... (keep existing fight callback handlers)

        await ctx.answerCbQuery();
    } catch (error) {
        console.error('Error handling callback query:', error);
        await ctx.answerCbQuery('❌ An error occurred.');
    }
});

// ======================
// RESOLVE FIGHT COMMAND (Fight Admin only)
// ======================

bot.command('resolve_fight', (ctx) => requireFightAdmin(ctx, async () => {
    const fights = await getActiveFights();
    if (fights.length === 0) {
        return ctx.reply('🥊 No active fights to resolve.');
    }

    const buttons = fights.map((fight) => {
        const label = `${fight.fighter1.name} vs ${fight.fighter2.name}`;
        return [{ text: label, callback_data: `resolve:${fight.id}` }];
    });

    await ctx.reply('🥊 Select a fight to resolve:', {
        reply_markup: { inline_keyboard: buttons }
    });
}));

// ======================
// ERROR HANDLING
// ======================

// Add proper error handling for bot launch
if (process.env.NODE_ENV !== 'production') {
    bot.launch()
        .then(() => {
            console.log('Bot started successfully (polling)');
            console.log('Fight Admin IDs:', FIGHT_ADMIN_IDS);
            console.log('Restaurant Admin IDs:', RESTAURANT_ADMIN_IDS);
            console.log('Super Admin IDs:', SUPER_ADMIN_IDS);
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

// Global error handler
bot.catch((err, ctx) => {
    console.error(`Error in bot update ${ctx.updateType}:`, err);
    console.error('Update object:', JSON.stringify(ctx.update, null, 2));
    
    try {
        ctx.reply('❌ Sorry, an error occurred while processing your request. The error has been logged.');
    } catch (replyError) {
        console.error('Failed to send error message:', replyError);
    }
});

// Add process-level error handlers
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Re-export everything properly
export { bot };
export default bot;