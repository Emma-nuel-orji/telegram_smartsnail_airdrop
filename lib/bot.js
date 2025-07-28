import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
// import axios from 'axios';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/fighters';
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const FIGHTER_STEPS = {
    NAME: 'name',
    AGE: 'age',
    GENDER: 'gender',
    HEIGHT: 'height',
    WEIGHT: 'weight',
    FIGHTING_WEIGHT: 'fighting_weight',
    TELEGRAM_ID: 'telegram_id',
    IMAGE: 'image',
    CONFIRM: 'confirm'
};

// ===== VALIDATION FUNCTIONS =====
const validators = {
    name: (input) => {
        const name = input.trim();
        if (name.length < 2) return { valid: false, error: 'Name must be at least 2 characters long.' };
        if (name.length > 50) return { valid: false, error: 'Name must be less than 50 characters long.' };
        if (!/^[a-zA-Z\s\-'\.]+$/.test(name)) return { valid: false, error: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods.' };
        return { valid: true, value: name };
    },
    
    age: (input) => {
        const age = parseInt(input.trim());
        if (isNaN(age)) return { valid: false, error: 'Age must be a number.' };
        if (age < 18 || age > 65) return { valid: false, error: 'Age must be between 18 and 65.' };
        return { valid: true, value: age };
    },

    gender: (input) => {
        const normalized = input.trim().toLowerCase();
        if (['male', 'm'].includes(normalized)) return { valid: true, value: 'Male' };
        if (['female', 'f'].includes(normalized)) return { valid: true, value: 'Female' };
        return {
            valid: false,
            error: 'Please enter a valid gender: Male or Female.'
        };
    },
    
    height: (input) => {
        const trimmed = input.trim().toLowerCase();
        
        // Check for feet/inches format (e.g., "5ft 8in", "5'8\"", "5 ft 8 in")
        const feetInchesMatch = trimmed.match(/(\d+)(?:ft|'|\s*feet?)\s*(\d+)(?:in|"|\s*inches?)/);
        if (feetInchesMatch) {
            const feet = parseInt(feetInchesMatch[1]);
            const inches = parseInt(feetInchesMatch[2]);
            
            if (feet < 4 || feet > 8) return { valid: false, error: 'Height must be between 4ft and 8ft.' };
            if (inches < 0 || inches > 11) return { valid: false, error: 'Inches must be between 0 and 11.' };
            
            const heightInMeters = ((feet * 12) + inches) * 0.0254;
            return { valid: true, value: parseFloat(heightInMeters.toFixed(2)) };
        }
        
        // Check for meters format (e.g., "1.75m", "1.75")
        const metersMatch = trimmed.match(/(\d+\.?\d*)(?:m|meters?)?$/);
        if (metersMatch) {
            const height = parseFloat(metersMatch[1]);
            if (height < 1.2 || height > 2.5) return { valid: false, error: 'Height must be between 1.2m and 2.5m.' };
            return { valid: true, value: height };
        }
        
        return { valid: false, error: 'Height format not recognized. Use formats like "5ft 8in" or "1.75m".' };
    },
    
    weight: (input) => {
        const weight = parseFloat(input.trim().replace(/kg|kilograms?/i, ''));
        if (isNaN(weight)) return { valid: false, error: 'Weight must be a number.' };
        if (weight < 40 || weight > 200) return { valid: false, error: 'Weight must be between 40kg and 200kg.' };
        return { valid: true, value: weight };
    },
    
    fighting_weight: (input) => {
        const weight = parseFloat(input.trim().replace(/kg|kilograms?/i, ''));
        if (isNaN(weight)) return { valid: false, error: 'Fighting weight must be a number.' };
        if (weight < 40 || weight > 200) return { valid: false, error: 'Fighting weight must be between 40kg and 200kg.' };
        return { valid: true, value: weight };
    },
    
    telegram_id: (input) => {
        const id = input.trim();
        if (!/^\d+$/.test(id)) return { valid: false, error: 'Telegram ID must contain only numbers.' };
        if (id.length < 5 || id.length > 15) return { valid: false, error: 'Telegram ID must be between 5 and 15 digits.' };
        return { valid: true, value: id };
    }
};

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

// ======================
// PERMISSION SYSTEM - NEW DATABASE-DRIVEN APPROACH
// ======================

// Keep only SUPER_ADMIN_IDS for fallback/initial setup
const SUPER_ADMIN_IDS = (process.env.SUPER_ADMIN_IDS?.split(',').map(id => Number(id.trim())).filter(id => !isNaN(id))) || [];

// Database-driven permission checking functions
async function getAdminData(userId) {
    try {
        const admin = await prisma.admin.findUnique({
            where: { telegramId: BigInt(userId) },
            include: {
                partner: true
            }
        });
        return admin;
    } catch (error) {
        console.error('Error fetching admin data:', error);
        return null;
    }
}

// Check if user has specific permission
async function hasPermission(ctx, requiredPermission, partnerId = null) {
    const userId = ctx.from?.id;
    if (!userId) return false;

    // Check hardcoded super admins first (fallback)
    if (SUPER_ADMIN_IDS.includes(userId)) return true;

    try {
        const admin = await getAdminData(userId);
        if (!admin) return false;

        // Check if admin has SUPERADMIN permission (covers everything)
        if (admin.permissions.includes('SUPERADMIN')) return true;

        // Check if admin has the specific required permission
        if (!admin.permissions.includes(requiredPermission)) return false;

        // If partnerId is specified, check if admin belongs to that partner
        if (partnerId && admin.partnerId !== partnerId) return false;

        return true;
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}

// Check if user is admin for specific partner type
async function isPartnerAdmin(ctx, partnerType, partnerId = null) {
    const userId = ctx.from?.id;
    if (!userId) return false;

    // Check hardcoded super admins first (fallback)
    if (SUPER_ADMIN_IDS.includes(userId)) return true;

    try {
        const admin = await getAdminData(userId);
        if (!admin) return false;

        // Super admin permission covers everything
        if (admin.permissions.includes('SUPERADMIN')) return true;

        // Check if admin's partner matches the required type
        if (!admin.partner || admin.partner.type !== partnerType) return false;

        // If specific partner ID is provided, verify it matches
        if (partnerId && admin.partnerId !== partnerId) return false;

        // For gym admins, check GYM_ADMIN permission
        if (partnerType === 'GYM' && admin.permissions.includes('GYM_ADMIN')) return true;

        // For restaurant admins, check MENU_MANAGER permission
        if (partnerType === 'RESTAURANT' && admin.permissions.includes('MENU_MANAGER')) return true;

        return false;
    } catch (error) {
        console.error('Error checking partner admin permissions:', error);
        return false;
    }
}

async function downloadAndSaveImage(fileId, fileName) {
    try {
        const fileUrl = await bot.telegram.getFileLink(fileId);
        const response = await axios({
            method: 'GET',
            url: fileUrl,
            responseType: 'stream'
        });
        
        const filePath = path.join(UPLOAD_DIR, fileName);
        const writer = fs.createWriteStream(filePath);
        
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(filePath));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading image:', error);
        throw new Error('Failed to download image');
    }
}

function generateImageFileName(originalName, telegramId) {
    const ext = path.extname(originalName) || '.jpg';
    const hash = crypto.createHash('md5').update(`${telegramId}-${Date.now()}`).digest('hex');
    return `fighter_${telegramId}_${hash}${ext}`;
}

// ===== STEP PROMPTS =====
const getStepPrompt = (step, data = {}) => {
    const prompts = {
        [FIGHTER_STEPS.NAME]: {
            text: '👤 **Step 1/8: Fighter Name**\n\nPlease enter the fighter\'s full name:',
            example: 'Example: John Doe'
        },
        [FIGHTER_STEPS.AGE]: {
            text: '🎂 **Step 2/8: Age**\n\nPlease enter the fighter\'s age (18-65):',
            example: 'Example: 28'
        },
        [FIGHTER_STEPS.GENDER]: {
            text: '⚧️ **Step 3/8: Gender**\n\nPlease enter the fighter\'s gender (Male or Female):',
            example: 'Example: Male'
        },
        [FIGHTER_STEPS.HEIGHT]: {
            text: '📏 **Step 4/8: Height**\n\nPlease enter the fighter\'s height:\n\n**Formats accepted:**\n• Feet/Inches: 5ft 8in, 5\'8", 6 feet 2 inches\n• Meters: 1.75m, 1.75',
            example: 'Example: 5ft 8in or 1.73m'
        },
        [FIGHTER_STEPS.WEIGHT]: {
            text: '⚖️ **Step 5/8: Weight**\n\nPlease enter the fighter\'s current weight in kilograms:',
            example: 'Example: 86 or 86kg'
        },
        [FIGHTER_STEPS.FIGHTING_WEIGHT]: {
            text: '🥊 **Step 6/8: Fighting Weight**\n\nPlease enter the fighter\'s fighting weight in kilograms:',
            example: 'Example: 80 or 80kg'
        },
        [FIGHTER_STEPS.TELEGRAM_ID]: {
            text: '📱 **Step 7/8: Telegram ID**\n\nPlease enter the fighter\'s Telegram ID (unique identifier):',
            example: 'Example: 123456789'
        },
        [FIGHTER_STEPS.IMAGE]: {
            text: '📸 **Step 8/8: Fighter Photo**\n\nPlease send a photo of the fighter, or type "skip" to continue without a photo:\n\n**Requirements:**\n• Maximum size: 5MB\n• Formats: JPG, PNG, WebP\n• Clear, professional photo preferred',
            example: 'Send photo or type: skip'
        },
        [FIGHTER_STEPS.CONFIRM]: {
            text: '✅ **Review Fighter Details**\n\nPlease review the information below:\n\n' +
                  `**Name:** ${data.name}\n` +
                  `**Age:** ${data.age} years\n` +
                  `**Gender:** ${data.gender}\n` +
                  `**Height:** ${data.height}m\n` +
                  `**Weight:** ${data.weight}kg\n` +
                  `**Fighting Weight:** ${data.fighting_weight}kg\n` +
                  `**Telegram ID:** ${data.telegram_id}\n` +
                  `**Photo:** ${data.imageUrl ? 'Uploaded' : 'No photo'}\n\n` +
                  'Type "confirm" to create the fighter or "restart" to start over:',
            example: 'Type: confirm or restart'
        }
    };
    
    return prompts[step];
};


// Specific permission checking functions
async function isFightManager(ctx) {
    return await hasPermission(ctx, 'FIGHT_MANAGER');
}

async function isMenuManager(ctx, partnerId = null) {
    return await hasPermission(ctx, 'MENU_MANAGER', partnerId);
}

async function isGymAdmin(ctx, partnerId = null) {
    return await isPartnerAdmin(ctx, 'GYM', partnerId) || await hasPermission(ctx, 'GYM_ADMIN', partnerId);
}

async function isRestaurantAdmin(ctx, partnerId = null) {
    return await isPartnerAdmin(ctx, 'RESTAURANT', partnerId) || await hasPermission(ctx, 'MENU_MANAGER', partnerId);
}

async function isSuperAdmin(ctx) {
    const userId = ctx.from?.id;
    if (!userId) return false;

    // Check hardcoded super admins first
    if (SUPER_ADMIN_IDS.includes(userId)) return true;

    // Check database for SUPERADMIN permission
    return await hasPermission(ctx, 'SUPERADMIN');
}

// Helper function to get admin's partner
async function getAdminPartner(ctx) {
    const userId = ctx.from?.id;
    if (!userId) return null;

    try {
        const admin = await prisma.admin.findUnique({
            where: { telegramId: BigInt(userId) },
            include: { partner: true }
        });
        return admin?.partner || null;
    } catch (error) {
        console.error('Error fetching admin partner:', error);
        return null;
    }
}

// Middleware functions
function requireFightManager() {
    return async (ctx, next) => {
        if (!(await isFightManager(ctx))) {
            ctx.reply('❌ You do not have permission to use this command. This requires FIGHT_MANAGER permission.');
            return;
        }
        return next();
    };
}

function requireMenuManager(partnerId = null) {
    return async (ctx, next) => {
        if (!(await isMenuManager(ctx, partnerId))) {
            ctx.reply('❌ You do not have permission to use this command. This requires MENU_MANAGER permission.');
            return;
        }
        return next();
    };
}

function requireGymAdmin(partnerId = null) {
    return async (ctx, next) => {
        if (!(await isGymAdmin(ctx, partnerId))) {
            ctx.reply('❌ You do not have permission to use this command. This is for gym administrators only.');
            return;
        }
        return next();
    };
}

function requireRestaurantAdmin(partnerId = null) {
    return async (ctx, next) => {
        if (!(await isRestaurantAdmin(ctx, partnerId))) {
            ctx.reply('❌ You do not have permission to use this command. This is for restaurant administrators only.');
            return;
        }
        return next();
    };
}

function requireSuperAdmin() {
    return async (ctx, next) => {
        if (!(await isSuperAdmin(ctx))) {
            ctx.reply('❌ You do not have permission to use this command. This requires SUPERADMIN permission.');
            return;
        }
        return next();
    };
}

// ======================
// BASIC COMMANDS
// ======================

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


bot.start(async (ctx) => {
    try {
        const userId = ctx.from?.id;
        const startPayload = ctx.startPayload;
        
        console.log(`New user started: ${userId}, Referral payload: ${startPayload}`); 
        
        if (!userId) {
            console.error('No user ID found in context');
            return;
        }
        
        // Step 1: Create or update user first
        let userCreated = false;
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
                const errorText = await userResponse.text();
                console.error(`API Error: User creation failed with status ${userResponse.status}:`, errorText);
                
                // If user already exists, that's fine
                if (userResponse.status !== 409) { // 409 = Conflict (user exists)
                    throw new Error(`Failed to create user: ${errorText}`);
                }
            } else {
                userCreated = true;
                console.log(`User ${userId} created successfully`);
            }
        } catch (error) {
            console.error('Error creating/updating user:', error);
        }
        
        // Step 2: Process referral if exists and user was created/found
        let referralProcessed = false;
        if (startPayload && startPayload.trim() !== '') {
            try {
                console.log(`Processing referral from ${startPayload} to ${userId}`);
                
                const referrerId = startPayload.trim();
                
                // Validate referrer ID format
                if (!/^\d+$/.test(referrerId)) {
                    console.error(`Invalid referrer ID format: ${startPayload}`);
                    await ctx.reply('⚠️ Invalid referral link format. Welcome anyway!');
                } else if (referrerId === userId.toString()) {
                    console.error(`Self-referral attempted: ${userId}`);
                    await ctx.reply('⚠️ You cannot refer yourself! Welcome anyway!');
                } else {
                    // Add a longer delay to ensure user creation is fully complete
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    const referralResponse = await fetch(`${API_BASE_URL}/api/referrals`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            userTelegramId: userId.toString(),
                            referrerTelegramId: referrerId,
                        }),
                    });
                    
                    const referralData = await referralResponse.json();
                    
                    if (referralResponse.ok) {
                        if (referralData.success) {
                            console.log(`Referral created successfully for user ${userId}`);
                            await ctx.reply(`🎉 You joined with a referral! Your referrer has been rewarded with points.`);
                            referralProcessed = true;
                        } else if (referralData.existing) {
                            console.log(`User ${userId} already has a referral`);
                            await ctx.reply(`ℹ️ You already have a referral recorded. Welcome back!`);
                        }
                    } else {
                        console.error(`Referral API Error (${referralResponse.status}):`, referralData);
                        
                        // Provide user-friendly error messages
                        let errorMessage = '⚠️ Unable to process referral, but welcome to SmartSnail!';
                        
                        if (referralData.error) {
                            if (referralData.error.includes('Referrer not found')) {
                                errorMessage = '⚠️ The referral link is invalid (referrer not found). Welcome anyway!';
                            } else if (referralData.error.includes('already exists')) {
                                errorMessage = 'ℹ️ You already have a referral. Welcome back!';
                            }
                        }
                        
                        await ctx.reply(errorMessage);
                    }
                }
            } catch (error) {
                console.error('Error processing referral:', error);
                await ctx.reply('⚠️ There was an issue processing your referral, but welcome to SmartSnail!');
            }
        }
        
        // Step 3: Always send welcome message
        const welcomeMessage = referralProcessed 
            ? `Welcome, ${ctx.from.first_name}! 🎉\n\n✅ Your referral has been recorded!`
            : `Welcome, ${ctx.from.first_name}! 🎉`;
            
        await ctx.reply(welcomeMessage, {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: "🚀 Open SmartSnail App",
                            web_app: {
                                url: "https://telegram-smartsnail-airdrop.vercel.app",
                            },
                        },
                    ],
                ],
            },
        });
        
        // Step 4: Log final status
        console.log(`Start command completed for user ${userId}:`, {
            userCreated,
            referralProcessed,
            referrerId: startPayload || 'none'
        });
        
    } catch (error) {
        console.error('Error in start handler:', error);
        try {
            await ctx.reply('Sorry, there was an error processing your start command. Please try again.');
        } catch (replyError) {
            console.error('Could not send error message:', replyError);
        }
    }
});

// Set bot commands
bot.telegram.setMyCommands([
    { command: 'ping', description: 'Check if bot is alive' },
    // Fight commands
    { command: 'schedule_fight', description: 'Schedule a new fight (Fight Manager)' },
    { command: 'resolve_fight', description: 'Resolve an existing fight (Fight Manager)' },
    { command: 'list_fights', description: 'List all active fights' },
    { command: 'addfighter', description: 'Add a new fighter (Fight Manager)' },
    { command: 'cancel', description: 'cancel operation' },
    // Restaurant commands
    { command: 'add_menu_item', description: 'Add a new menu item (Menu Manager)' },
    { command: 'list_menu', description: 'List all menu items' },
    { command: 'edit_menu_item', description: 'Edit a menu item (Menu Manager)' },
    { command: 'delete_menu_item', description: 'Delete a menu item (Menu Manager)' },
    // Gym commands
    { command: 'add_gym_service', description: 'Add a new gym service (Gym Admin)' },
    // Admin commands
    { command: 'add_admin', description: 'Add a new admin (Super Admin)' },
    { command: 'list_admins', description: 'List all admins (Super Admin)' },
    // Super admin commands
    { command: 'broadcast', description: 'Broadcast message (Super Admin)' }
]).catch(error => {
    console.error('Failed to set commands:', error);
});

// Store fights and menu items being created/edited in memory
const newFights = {};
const menuItemCreation = {};



// ======================
// RESTAURANT MENU COMMANDS - UPDATED WITH PARTNER SENSITIVITY
// ======================

bot.command('add_menu_item', async (ctx) => {
    if (await isSuperAdmin(ctx)) {
        const partners = await prisma.partner.findMany({ where: { type: 'RESTAURANT' } });
        if (partners.length === 0) return ctx.reply('❌ No restaurant partners found.');

        const buttons = partners.map(partner => [{ text: partner.name, callback_data: `select_partner_menu:${partner.id}` }]);
        return ctx.reply('🏢 Select a restaurant partner to add menu items for:', {
            reply_markup: { inline_keyboard: buttons },
        });
    }

    const adminPartner = await getAdminPartner(ctx);
    if (!adminPartner || !(await isMenuManager(ctx, adminPartner.id))) {
        return ctx.reply('❌ You do not have permission to manage menu items for this partner.');
    }

    const chatId = ctx.chat?.id;
    if (chatId) {
        menuItemCreation[chatId] = {
            step: 'name',
            partnerId: adminPartner.id,
            partnerName: adminPartner.name,
        };
        ctx.reply(`🍽️ Let's add a new menu item for ${adminPartner.name}!
\nPlease enter the item name:`);
    }
});

// List all menu items
bot.command('list_menu', async (ctx) => {
    try {
        let menuItems;
        let partnerName = '';
        const isSuper = await isSuperAdmin(ctx);
        const adminPartner = await getAdminPartner(ctx);

        if (isSuper) {
            menuItems = await prisma.service.findMany({
                where: { type: 'ONE_TIME' },
                include: { partner: true },
                orderBy: { createdAt: 'desc' }
            });
        } else if (adminPartner && (await isMenuManager(ctx, adminPartner.id))) {
            menuItems = await prisma.service.findMany({
                where: { type: 'ONE_TIME', partnerId: adminPartner.id },
                orderBy: { createdAt: 'desc' }
            });
            partnerName = ` for ${adminPartner.name}`;
        } else {
            // Public view fallback
            menuItems = await prisma.service.findMany({
                where: { type: 'ONE_TIME' },
                include: { partner: true },
                orderBy: { createdAt: 'desc' }
            });
        }

        if (menuItems.length === 0) {
            ctx.reply(`📋 No menu items found${partnerName}.`);
            return;
        }

        let message = `🍽️ **Menu Items${partnerName}:**\n\n`;
        menuItems.forEach((item, index) => {
            message += `${index + 1}. **${item.name}**\n`;
            message += `   💰 Price: ${item.priceShells} Shells\n`;
            if (item.partner && (!adminPartner || isSuper)) {
                message += `   🏢 Partner: ${item.partner.name}\n`;
            }
            message += `   📅 Added: ${item.createdAt.toLocaleDateString()}\n\n`;
        });

        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error listing menu items:', error);
        ctx.reply('❌ An error occurred while fetching menu items.');
    }
});




// Edit menu item command
bot.command('edit_menu_item', async (ctx) => {
  const isSuper = await isSuperAdmin(ctx);
  const adminPartner = isSuper ? null : await getAdminPartner(ctx);

  if (!isSuper && !adminPartner) {
    ctx.reply('❌ You must be associated with a partner to use this command.');
    return;
  }

  if (!isSuper && !(await isMenuManager(ctx, adminPartner.id))) {
    ctx.reply('❌ You do not have permission to manage menu items for this partner.');
    return;
  }

  try {
    let menuItems;
    if (isSuper) {
      menuItems = await prisma.service.findMany({
        where: { type: 'ONE_TIME' },
        include: { partner: true },
        orderBy: { name: 'asc' }
      });
    } else {
      menuItems = await prisma.service.findMany({
        where: {
          type: 'ONE_TIME',
          partnerId: adminPartner.id
        },
        orderBy: { name: 'asc' }
      });
    }

    if (menuItems.length === 0) {
      ctx.reply('📋 No menu items to edit.');
      return;
    }

    const buttons = menuItems.map(item => [
      {
        text: `${item.name} (${item.priceShells} Shells)`,
        callback_data: `edit_menu:${item.id}`
      }
    ]);

    ctx.reply(`📝 Select a menu item to edit:`, {
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (error) {
    console.error('Error fetching menu items for editing:', error);
    ctx.reply('❌ An error occurred while fetching menu items.');
  }
});



// Delete menu item command
bot.command('delete_menu_item', async (ctx) => {
  const isSuper = await isSuperAdmin(ctx);
  const adminPartner = isSuper ? null : await getAdminPartner(ctx);

  if (!isSuper && !adminPartner) {
    ctx.reply('❌ You must be associated with a partner to use this command.');
    return;
  }

  if (!isSuper && !(await isMenuManager(ctx, adminPartner.id))) {
    ctx.reply('❌ You do not have permission to manage menu items for this partner.');
    return;
  }

  try {
    let menuItems;
    if (isSuper) {
      menuItems = await prisma.service.findMany({
        where: { type: 'ONE_TIME' },
        include: { partner: true },
        orderBy: { name: 'asc' }
      });
    } else {
      menuItems = await prisma.service.findMany({
        where: {
          type: 'ONE_TIME',
          partnerId: adminPartner.id
        },
        orderBy: { name: 'asc' }
      });
    }

    if (menuItems.length === 0) {
      ctx.reply('📋 No menu items to delete.');
      return;
    }

    const buttons = menuItems.map(item => [
      {
        text: `❌ ${item.name} (${item.priceShells} Shells)`,
        callback_data: `delete_menu:${item.id}`
      }
    ]);

    ctx.reply(`🗑️ Select a menu item to delete:`, {
      reply_markup: { inline_keyboard: buttons }
    });
  } catch (error) {
    console.error('Error fetching menu items for deletion:', error);
    ctx.reply('❌ An error occurred while fetching menu items.');
  }
});




// ======================
// GYM COMMANDS - NEW PARTNER-SENSITIVE COMMANDS
// ======================

bot.command('add_gym_service', async (ctx) => {
    if (await isSuperAdmin(ctx)) {
        const partners = await prisma.partner.findMany({ where: { type: 'GYM' } });
        if (partners.length === 0) return ctx.reply('❌ No gym partners found.');

        const buttons = partners.map(partner => [{ text: partner.name, callback_data: `select_partner_gym:${partner.id}` }]);
        return ctx.reply('🏋️ Select a gym partner to add services for:', {
            reply_markup: { inline_keyboard: buttons },
        });
    }

    const adminPartner = await getAdminPartner(ctx);
    if (!adminPartner || adminPartner.type !== 'GYM' || !(await isGymAdmin(ctx, adminPartner.id))) {
        return ctx.reply('❌ You do not have permission to manage services for this gym.');
    }

    const chatId = ctx.chat?.id;
    if (chatId) {
        ctx.session = ctx.session || {};
        ctx.session.partnerId = adminPartner.id;
        ctx.session.step = 'awaiting_service_name';
        ctx.reply(`🏋️ Let's add a new service for ${adminPartner.name}!
\nPlease enter the service name:`);
    }
});

// ======================
// ADMIN MANAGEMENT COMMANDS
// ======================

bot.command('add_admin', async (ctx) => {
    if (!(await isSuperAdmin(ctx))) {
        ctx.reply('❌ You do not have permission to use this command. This requires SUPERADMIN permission.');
        return;
    }

    ctx.reply('👤 Please provide the admin details in the following format:\n\n' +
        'Telegram ID, Partner ID (optional), Permissions (comma-separated)\n\n' +
        'Available permissions: SUPERADMIN, FIGHT_MANAGER, MENU_MANAGER, GYM_ADMIN\n\n' +
        'Examples:\n' +
        '"123456789, , FIGHT_MANAGER" (fight manager, no specific partner)\n' +
        '"987654321, 507f1f77bcf86cd799439011, GYM_ADMIN" (gym admin for specific partner)');
    
    ctx.session = ctx.session || {};
    ctx.session.step = 'awaiting_admin_details';
});

bot.command('list_admins', async (ctx) => {
    if (!(await isSuperAdmin(ctx))) {
        ctx.reply('❌ You do not have permission to use this command.');
        return;
    }

    try {
        const admins = await prisma.admin.findMany({
            include: { partner: true },
            orderBy: { telegramId: 'asc' }
        });

        if (admins.length === 0) {
            ctx.reply('📋 No admins found.');
            return;
        }

        let message = '👥 **System Administrators:**\n\n';
        admins.forEach((admin, index) => {
            message += `${index + 1}. **Telegram ID:** ${admin.telegramId}\n`;
            message += `   🔑 Permissions: ${admin.permissions.join(', ')}\n`;
            if (admin.partner) {
                message += `   🏢 Partner: ${admin.partner.name} (${admin.partner.type})\n`;
            }
            message += '\n';
        });

        ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
        console.error('Error listing admins:', error);
        ctx.reply('❌ An error occurred while fetching admins.');
    }
});

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
                gender: fighterData.gender || null,
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


async function createFighter(ctx) {
    try {
        const data = ctx.session.data;
        
        // Check if fighter already exists
        const existingFighter = await prisma.fighter.findUnique({
            where: { telegramId: BigInt(data.telegram_id) }
        });
        
        if (existingFighter) {
            return ctx.reply(`❌ A fighter with Telegram ID ${data.telegram_id} already exists.\n\nUse /cancel to start over with a different ID.`);
        }
        
        const loadingMsg = await ctx.reply('⏳ Creating fighter...');
        
        const fighterData = {
            name: data.name,
            age: data.age,
            gender: data.gender, // Add gender field
            height: data.height,
            weight: data.weight,
            fightingWeight: data.fighting_weight,
            imageUrl: data.imageUrl || null,
            telegramId: BigInt(data.telegram_id)
        };
        
        const fighter = await saveFighterToDatabase(fighterData);
        
        await ctx.deleteMessage(loadingMsg.message_id);
        
        let message = `🎉 *Fighter Created Successfully!*\n\n` +
            `🆔 *Name:* ${fighter.name}\n` +
            `🎂 *Age:* ${fighter.age}\n` +
            `⚧️ *Gender:* ${fighter.gender}\n` +
            `📏 *Height:* ${fighter.height}m\n` +
            `⚖️ *Weight:* ${fighter.weight}kg\n` +
            `🥊 *Fighting Weight:* ${fighter.fightingWeight}kg\n` +
            `📱 *Telegram ID:* ${fighter.telegramId}\n`;
        
        await ctx.reply(message, { parse_mode: 'Markdown' });
        
        if (fighter.imageUrl) {
            await ctx.replyWithPhoto({ url: fighter.imageUrl }, { caption: `📸 Fighter Photo` });
        }
        
        ctx.session = {}; // Reset session
    } catch (error) {
        console.error('Error in createFighter:', error);
        await ctx.reply('❌ Failed to create fighter. Please try again or contact support.');
    }
}

// Schedule a new fight (fight admin only)
bot.command('schedule_fight', async (ctx) => {
    if (!(await isFightManager(ctx)) && !(await isSuperAdmin(ctx))) {
        ctx.reply('❌ You do not have permission to use this command. This requires FIGHT_MANAGER or SUPERADMIN permission.');
        return;
    }

    const chatId = ctx.chat?.id;
    if (chatId) {
        newFights[chatId] = {};
        ctx.reply('🥊 Let\'s schedule a new fight!\n\nPlease enter the fight title:');
    }
});


// Add fighter command (fight admin only)
bot.command('addfighter', async (ctx) => {
    try {
        if (!(await isFightManager(ctx)) && !(await isSuperAdmin(ctx))) {
            return ctx.reply('❌ You do not have permission to use this command.');
        }
        
        const welcomeText = `🥊 **Add New Fighter**\n\n` +
            `I'll guide you through adding a new fighter step by step.\n\n` +
            `This process has 8 steps:\n` +
            `1️⃣ Name\n` +
            `2️⃣ Age\n` +
            `3️⃣ Gender\n` +
            `4️⃣ Height\n` +
            `5️⃣ Weight\n` +
            `6️⃣ Fighting Weight\n` +
            `7️⃣ Telegram ID\n` +
            `8️⃣ Photo (optional)\n\n` +
            `You can type /cancel at any time to stop.\n\n` +
            `Let's start! 🚀`;
        
        await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
        
        // Initialize session
        ctx.session = {
            step: FIGHTER_STEPS.NAME,
            data: {},
            timestamp: Date.now(),
            userId: ctx.from.id
        };
        
        // Send first prompt
        const prompt = getStepPrompt(FIGHTER_STEPS.NAME);
        await ctx.reply(`${prompt.text}\n\n${prompt.example}`, { parse_mode: 'Markdown' });
        
        // Auto-cleanup session after 30 minutes
        setTimeout(() => {
            if (ctx.session?.step && ctx.session.step !== FIGHTER_STEPS.CONFIRM) {
                ctx.session = {};
            }
        }, 1800000); // 30 minutes
        
    } catch (error) {
        console.error('Error in addfighter command:', error);
        await ctx.reply('❌ An error occurred. Please try again later.');
    }
});

// ===== ADD CANCEL COMMAND =====
bot.command('cancel', async (ctx) => {
    if (ctx.session?.step) {
        ctx.session = {};
        await ctx.reply('❌ Operation cancelled. You can start over anytime.');
    } else {
        await ctx.reply('ℹ️ No active operation to cancel.');
    }
});

 // Handle /resolve_fight command (admin only)
bot.command('resolve_fight', async (ctx) => {
    if (!(await isFightManager(ctx)) && !(await isSuperAdmin(ctx))) {
        ctx.reply('❌ You do not have permission to use this command. This requires FIGHT_MANAGER or SUPERADMIN permission.');
        return;
    }

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
});


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
bot.command('broadcast', async (ctx) => {
    if (!(await isSuperAdmin(ctx))) {
        ctx.reply('❌ You do not have permission to use this command. This requires SUPERADMIN permission.');
        return;
    }

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
});

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

  // Initialize session if not exists
  ctx.session = ctx.session || {};

  // ===== NEW STEP-BY-STEP FIGHTER CREATION =====
  if (ctx.session?.step && Object.values(FIGHTER_STEPS).includes(ctx.session.step)) {
    try {
      const currentStep = ctx.session.step;
      
      // Handle special commands
      if (text.toLowerCase() === 'cancel') {
        ctx.session = {};
        return ctx.reply('❌ Fighter creation cancelled.');
      }
      
      if (text.toLowerCase() === 'restart' && currentStep === FIGHTER_STEPS.CONFIRM) {
        ctx.session = {
          step: FIGHTER_STEPS.NAME,
          data: {},
          timestamp: Date.now(),
          userId: ctx.from.id
        };
        const prompt = getStepPrompt(FIGHTER_STEPS.NAME);
        return ctx.reply(`${prompt.text}\n\n${prompt.example}`, { parse_mode: 'Markdown' });
      }
      
      if (text.toLowerCase() === 'confirm' && currentStep === FIGHTER_STEPS.CONFIRM) {
        return await createFighter(ctx);
      }
      
      if (text.toLowerCase() === 'skip' && currentStep === FIGHTER_STEPS.IMAGE) {
        // Skip image and go to confirm
        ctx.session.step = FIGHTER_STEPS.CONFIRM;
        const prompt = getStepPrompt(FIGHTER_STEPS.CONFIRM, ctx.session.data);
        return ctx.reply(`${prompt.text}`, { parse_mode: 'Markdown' });
      }
      
      // Process current step
      if (currentStep !== FIGHTER_STEPS.CONFIRM && currentStep !== FIGHTER_STEPS.IMAGE) {
        const validator = validators[currentStep];
        if (!validator) {
          return ctx.reply('❌ Invalid step. Please use /cancel and start over.');
        }
        
        const validation = validator(text);
        if (!validation.valid) {
          return ctx.reply(`❌ ${validation.error}\n\nPlease try again:`);
        }
        
        ctx.session.data[currentStep] = validation.value;
        
        // Move to next step
        const steps = Object.values(FIGHTER_STEPS);
        const currentIndex = steps.indexOf(currentStep);
        const nextStep = steps[currentIndex + 1];
        
        if (nextStep) {
          ctx.session.step = nextStep;
          const prompt = getStepPrompt(nextStep, ctx.session.data);
          return ctx.reply(`${prompt.text}\n\n${prompt.example}`, { parse_mode: 'Markdown' });
        }
      }
      
    } catch (error) {
      console.error('Error in fighter creation flow:', error);
      ctx.session = {};
      return ctx.reply('❌ An error occurred. Please start over with /addfighter.');
    }
    return;
  }

  // === Admin creation step ===
  if (ctx.session?.step === 'awaiting_admin_details' && await isSuperAdmin(ctx)) {
    const parts = text.split(',').map(p => p.trim());

    if (parts.length < 3) {
      ctx.reply('❌ Invalid format. Please provide: Telegram ID, Partner ID (or empty), Permissions');
      return;
    }

    const [telegramId, partnerId, ...permissions] = parts;

    try {
      const validPermissions = ['SUPERADMIN', 'FIGHT_MANAGER', 'MENU_MANAGER', 'GYM_ADMIN'];
      const invalidPerms = permissions.filter(p => !validPermissions.includes(p));

      if (invalidPerms.length > 0) {
        ctx.reply(`❌ Invalid permissions: ${invalidPerms.join(', ')}\nValid: ${validPermissions.join(', ')}`);
        return;
      }

      let partner = null;
      if (partnerId && partnerId !== '') {
        partner = await prisma.partner.findUnique({ where: { id: partnerId } });
        if (!partner) {
          ctx.reply('❌ Partner not found.');
          return;
        }
      }

      const adminData = {
        telegramId: BigInt(telegramId),
        permissions: permissions.map(p => p.trim()),
      };

      if (partnerId && partnerId !== '') {
        adminData.partnerId = partnerId;
      }

      const admin = await prisma.admin.create({
        data: adminData,
        include: { partner: true },
      });

      let responseMessage = `✅ Admin created successfully!\nTelegram ID: ${telegramId}\nPermissions: ${permissions.join(', ')}`;
      if (partner) {
        responseMessage += `\nPartner: ${partner.name}`;
      }

      ctx.reply(responseMessage);
      ctx.session.step = null;
    } catch (err) {
      console.error('Error creating admin:', err);
      ctx.reply('❌ Failed to create admin.');
    }

    return;
  }

  // === OLD FIGHTER REGISTRATION (Keep for backward compatibility) ===
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

  // === Menu item creation ===
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

      menuItem.price = price;
      menuItem.step = 'photo';
      ctx.reply('📸 Great! Now send a photo of the menu item:');

      try {
        const newMenuItem = await prisma.service.create({
          data: {
            name: menuItem.name,
            priceShells: price,
            type: 'ONE_TIME',
            partnerId: menuItem.partnerId,
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

  // === Menu item editing ===
  if (menuItemCreation[chatId]?.step === 'edit_name') {
    const itemId = menuItemCreation[chatId].itemId;
    try {
      const updatedItem = await prisma.service.update({
        where: { id: itemId },
        data: { name: text.trim() }
      });
      ctx.reply(`✅ Menu item name updated to: **${updatedItem.name}**`, { parse_mode: 'Markdown' });
      delete menuItemCreation[chatId];
    } catch (error) {
      console.error('Error updating menu item name:', error);
      ctx.reply('❌ Failed to update menu item name.');
      delete menuItemCreation[chatId];
    }
    return;
  }

  if (menuItemCreation[chatId]?.step === 'edit_price') {
    const itemId = menuItemCreation[chatId].itemId;
    const price = parseInt(text, 10);
    
    if (isNaN(price) || price <= 0) {
      ctx.reply('❌ Please enter a valid positive number for the price.');
      return;
    }
    
    try {
      const updatedItem = await prisma.service.update({
        where: { id: itemId },
        data: { priceShells: price }
      });
      ctx.reply(`✅ Menu item price updated to: **${updatedItem.priceShells} Shells**`, { parse_mode: 'Markdown' });
      delete menuItemCreation[chatId];
    } catch (error) {
      console.error('Error updating menu item price:', error);
      ctx.reply('❌ Failed to update menu item price.');
      delete menuItemCreation[chatId];
    }
    return;
  }

  // === Fight scheduling ===
  if (newFights[chatId] && (await isFightManager(ctx))) {
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
    return;
  }

  // === Gym service creation ===
  if (ctx.session?.step === 'awaiting_service_name') {
    ctx.session.serviceName = ctx.message.text.trim();
    ctx.session.step = 'awaiting_service_price';
    return ctx.reply('💰 Please enter the price in Shells (numbers only):');
  }

  if (ctx.session?.step === 'awaiting_service_price') {
    const price = parseInt(ctx.message.text.trim(), 10);

    if (isNaN(price) || price <= 0) {
      return ctx.reply('❌ Invalid price. Please enter a positive number.');
    }

    try {
      const newService = await prisma.service.create({
        data: {
          name: ctx.session.serviceName,
          priceShells: price,
          type: 'GYM_SUBSCRIPTION',
          partnerId: ctx.session.partnerId,
        },
      });

      await ctx.reply(`✅ Gym service added:\n🏋️ ${newService.name}\n💰 ${newService.priceShells} Shells`);
    } catch (error) {
      console.error('Error adding gym service:', error);
      await ctx.reply('❌ Failed to add the service. Please try again.');
    }

    ctx.session = {};
    return;
  }
});


// Handle photo uploads for fighter creation
bot.on('photo', async (ctx) => {
  const chatId = ctx.chat?.id;
  const photo = ctx.message.photo?.pop();

  if (!photo) {
    return ctx.reply('❌ Please send a valid photo.');
  }

  // === NEW STEP-BY-STEP FIGHTER IMAGE ===
  if (ctx.session?.step === FIGHTER_STEPS.IMAGE) {
    try {
      // Validate file size (approximate)
      if (photo.file_size && photo.file_size > MAX_IMAGE_SIZE) {
        return ctx.reply('❌ Image too large. Maximum size is 5MB. Please send a smaller image.');
      }

      const loadingMsg = await ctx.reply('📸 Processing image...');
      
      try {
        const fileLink = await ctx.telegram.getFileLink(photo.file_id);
        const fileName = generateImageFileName('fighter_photo.jpg', ctx.session.data.telegram_id);
        
        // For web deployment, you might want to store the direct Telegram file URL
        // instead of downloading and saving locally
        ctx.session.data.imageUrl = fileLink.href;
        
        await ctx.deleteMessage(loadingMsg.message_id);
        await ctx.reply('✅ Image uploaded successfully!');
        
        // Move to confirmation step
        ctx.session.step = FIGHTER_STEPS.CONFIRM;
        const prompt = getStepPrompt(FIGHTER_STEPS.CONFIRM, ctx.session.data);
        return ctx.reply(`${prompt.text}`, { parse_mode: 'Markdown' });
        
      } catch (imageError) {
        await ctx.deleteMessage(loadingMsg.message_id);
        console.error('Error processing fighter image:', imageError);
        return ctx.reply('❌ Failed to process image. You can type "skip" to continue without photo, or try again.');
      }
      
    } catch (error) {
      console.error('Error in fighter image upload:', error);
      return ctx.reply('❌ An error occurred. Type "skip" to continue without photo.');
    }
    return;
  }

  // === OLD FIGHTER IMAGE (Keep for backward compatibility) ===
  if (ctx.session?.step === 'awaiting_image') {
    try {
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      ctx.session.fighterData.imageUrl = fileLink.href;

      const newFighter = await saveFighterToDatabase(ctx.session.fighterData);

      await ctx.reply(
        `✅ Fighter ${newFighter.name} has been added successfully!\n\n` +
        `👤 Name: ${newFighter.name}\n` +
        `🎂 Age: ${newFighter.age} years\n` +
        `📏 Height: ${newFighter.height} _ft_in\n` +
        `⚖️ Weight: ${newFighter.weight} kg\n` +
        `🥊 Fighting Weight: ${newFighter.fightingWeight} kg`
      );

      ctx.session = {};
    } catch (error) {
      console.error('Error saving fighter:', error);
      ctx.reply('❌ There was an error saving the fighter. Please try again.\n\n' +
        'If the error persists, the fighter name might already exist in the database.');
    }
    return;
  }

  // === Menu item image ===
  if (menuItemCreation[chatId]?.step === 'photo') {
    try {
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      const menuItem = menuItemCreation[chatId];

      const newMenuItem = await prisma.service.create({
        data: {
          name: menuItem.name,
          priceShells: menuItem.price,
          type: 'ONE_TIME',
          partnerId: menuItem.partnerId,
          imageUrl: fileLink.href,
        }
      });

      await ctx.reply(
        `✅ Menu item added successfully!\n\n🍽️ *${newMenuItem.name}*\n💰 Price: ${newMenuItem.priceShells} Shells`,
        { parse_mode: 'Markdown' }
      );

      delete menuItemCreation[chatId];
    } catch (error) {
      console.error('Error creating menu item:', error);
      ctx.reply('❌ An error occurred while adding the menu item.');
      delete menuItemCreation[chatId];
    }
    return;
  }

  // === No active photo step ===
  ctx.reply('⚠️ Photo received, but no active step expects an image.');
});


// ======================
// CALLBACK QUERY HANDLERS
// ======================

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!data) return;

  try {
    // ===== MENU CALLBACKS =====
    if (data.startsWith('edit_menu:')) {
      if (!(await isRestaurantAdmin(ctx))) {
        await ctx.answerCbQuery('❌ You do not have permission to edit menu items.');
        return;
      }

      const itemId = data.split(':')[1];
      const menuItem = await prisma.service.findUnique({ where: { id: itemId }, include: { partner: true } });

      const admin = await prisma.admin.findUnique({
        where: { telegramId: BigInt(ctx.from.id) },
        include: { partner: true },
      });

      if (!menuItem || menuItem.partnerId !== admin?.partnerId) {
        await ctx.answerCbQuery('❌ You do not have permission to access this item.');
        return;
      }

      const buttons = [
        [{ text: '📝 Edit Name', callback_data: `edit_name:${itemId}` }],
        [{ text: '💰 Edit Price', callback_data: `edit_price:${itemId}` }],
        [{ text: '❌ Cancel', callback_data: 'cancel_edit' }],
      ];

      await ctx.editMessageText(
        `📝 **Edit Menu Item**\n\n🍽️ **Current Name:** ${menuItem.name}\n💰 **Current Price:** ${menuItem.priceShells} Shells\n\nWhat would you like to edit?`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons },
        }
      );
    }

    else if (data.startsWith('edit_name:') || data.startsWith('edit_price:')) {
      const itemId = data.split(':')[1];
      const chatId = ctx.chat?.id;
      if (chatId) {
        menuItemCreation[chatId] = {
          step: data.startsWith('edit_name:') ? 'edit_name' : 'edit_price',
          itemId,
        };
        const prompt = data.startsWith('edit_name:')
          ? '📝 Please enter the new name for this menu item:'
          : '💰 Please enter the new price in Shells (numbers only):';
        await ctx.editMessageText(prompt);
      }
    }

    else if (data.startsWith('delete_menu:')) {
      if (!(await isRestaurantAdmin(ctx))) {
        await ctx.answerCbQuery('❌ You do not have permission to delete menu items.');
        return;
      }

      const itemId = data.split(':')[1];
      const menuItem = await prisma.service.findUnique({ where: { id: itemId }, include: { partner: true } });

      const admin = await prisma.admin.findUnique({
        where: { telegramId: BigInt(ctx.from.id) },
        include: { partner: true },
      });

      if (!menuItem || menuItem.partnerId !== admin?.partnerId) {
        await ctx.answerCbQuery('❌ You do not have permission to access this item.');
        return;
      }

      const buttons = [[
        { text: '✅ Yes, Delete', callback_data: `confirm_delete:${itemId}` },
        { text: '❌ Cancel', callback_data: 'cancel_delete' },
      ]];

      await ctx.editMessageText(
        `⚠️ **Confirm Deletion**\n\nAre you sure you want to delete:\n🍽️ **${menuItem.name}** (${menuItem.priceShells} Shells)?\n\n**This action cannot be undone!**`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons },
        }
      );
    }

    else if (data.startsWith('confirm_delete:')) {
      const itemId = data.split(':')[1];
      const menuItem = await prisma.service.findUnique({ where: { id: itemId }, include: { partner: true } });

      const admin = await prisma.admin.findUnique({
        where: { telegramId: BigInt(ctx.from.id) },
        include: { partner: true },
      });

      if (!menuItem || menuItem.partnerId !== admin?.partnerId) {
        await ctx.answerCbQuery('❌ You do not have permission to access this item.');
        return;
      }

      try {
        const deletedItem = await prisma.service.delete({ where: { id: itemId } });
        await ctx.editMessageText(`✅ **Menu item deleted successfully!**\n\n🗑️ Deleted: **${deletedItem.name}**`);
      } catch (error) {
        console.error('Error deleting menu item:', error);
        await ctx.editMessageText('❌ An error occurred while deleting the menu item.');
      }
    }

    else if (data === 'cancel_edit' || data === 'cancel_delete') {
      await ctx.editMessageText('❌ Operation cancelled.');
    }

    // ===== FIGHT CALLBACKS =====
    else if (data.startsWith('resolve:')) {
      const fightId = parseInt(data.split(':')[1]);
      const fight = await prisma.fight.findUnique({
        where: { id: fightId },
        include: { fighter1: true, fighter2: true },
      });

      if (!fight) return ctx.reply('Fight not found.');

      const buttons = [
        [
          Markup.button.callback(`🏆 ${fight.fighter1.name}`, `resolve_win:${fightId}:${fight.fighter1.id}`),
          Markup.button.callback(`🏆 ${fight.fighter2.name}`, `resolve_win:${fightId}:${fight.fighter2.id}`),
        ],
        [
          Markup.button.callback('🤝 Draw', `resolve_draw:${fightId}`),
          Markup.button.callback('❌ Cancel', `resolve_cancel:${fightId}`),
        ],
      ];

      await ctx.editMessageText(
        `How do you want to resolve this fight?\n\n${fight.fighter1.name} vs ${fight.fighter2.name}`,
        Markup.inlineKeyboard(buttons)
      );
    }

    else if (data.startsWith('resolve_win:')) {
      const [_, fightIdStr, winnerIdStr] = data.split(':');
      const fightId = parseInt(fightIdStr);
      const winnerId = parseInt(winnerIdStr);

      await resolveFight(fightId, 'COMPLETED', winnerId);
      await ctx.editMessageText('✅ Fight resolved with a winner.');
    }

    else if (data.startsWith('resolve_draw:')) {
      const fightId = parseInt(data.split(':')[1]);

      await resolveFight(fightId, 'DRAW');
      await ctx.editMessageText('🤝 Fight marked as a draw.');
    }

    else if (data.startsWith('resolve_cancel:')) {
      const fightId = parseInt(data.split(':')[1]);

      await resolveFight(fightId, 'CANCELLED');
      await ctx.editMessageText('❌ Fight has been cancelled.');
    }

    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error handling callback query:', error);
    await ctx.answerCbQuery('❌ An error occurred.');
  }
});


// ======================
// ERROR HANDLING
// ======================

// Add proper error handling for bot launch
if (process.env.NODE_ENV !== 'production') {
    bot.launch()
        .then(() => {
            console.log('Bot started successfully (polling)');
            // console.log('Fight Admin IDs:', FIGHT_ADMIN_IDS);
            // console.log('Restaurant Admin IDs:', RESTAURANT_ADMIN_IDS);
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