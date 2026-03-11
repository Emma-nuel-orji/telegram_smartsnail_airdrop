import {cloudinary} from '@/lib/cloudinary'; 
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
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

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'fighters');

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Configure Cloudinary
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const menuItemCreation: {
//   [key: number]: {
//     name?: string;
//     price?: number;
//     partnerId?: string;
//     step?: string;
//   };
// } = {};

const newFights = {};
const menuItemCreation = {};


// Ensure upload directory exists
// if (!fs.existsSync(UPLOAD_DIR)) {
//     fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    
// }
console.log("UPLOAD_DIR:", UPLOAD_DIR);
console.log("fs.existsSync:", fs.existsSync(UPLOAD_DIR));


const FIGHTER_STEPS = {
    NAME: 'name',
    AGE: 'age',
    GENDER: 'gender',
    HEIGHT: 'height',
    WEIGHT: 'weight',
    WEIGHT_CLASS: 'weight_class',
    TELEGRAM_ID: 'telegram_id',
    IMAGE: 'image',
    CONFIRM: 'confirm'
};

const ALLOWED_WEIGHT_CLASSES = [
  'flyweight',
  'bantamweight',
  'featherweight',
  'lightweight',
  'welterweight',
  'middleweight',
  'light heavyweight',
  'heavyweight',
];

const fightState = {};


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

    
    weight_class: (input) => {
      const normalized = input.trim().toLowerCase();
      
      if (!ALLOWED_WEIGHT_CLASSES.includes(normalized)) {
        return { 
          valid: false, 
          error: `Invalid weight class. Please choose one of: ${ALLOWED_WEIGHT_CLASSES.join(', ')}.` 
        };
      }

      return { valid: true, value: normalized };
    },
    
    telegram_id: (input) => {
        const id = input.trim();
        if (!/^\d+$/.test(id)) return { valid: false, error: 'Telegram ID must contain only numbers.' };
        if (id.length < 5 || id.length > 15) return { valid: false, error: 'Telegram ID must be between 5 and 15 digits.' };
        return { valid: true, value: id };
    }
};

// Add session middleware with proper typing to avoid potential errors
// bot.use(session());
bot.use(session({
  defaultSession: () => ({
    step: null,
    data: null
  })
}));

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

async function uploadTelegramImageToCloudinary(fileId, telegramId) {
  const fileUrl = await bot.telegram.getFileLink(fileId);
  const response = await axios({ method: 'GET', url: fileUrl, responseType: 'stream' });

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'fighters',
        public_id: `fighter_${telegramId}_${Date.now()}`,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url); // ← this is the Cloudinary image URL
      }
    );

    response.data.pipe(uploadStream);
  });
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
        [FIGHTER_STEPS.WEIGHT_CLASS]: {
            text: '🥊 **Step 6/8: Weight Class**\n\nPlease enter the fighter\'s weight class:',
            example: 'Example: flyweight or lightweight or heavyweight etc'
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
                  `**Weight Class:** ${data.weight_class}` +
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


// 🎯 PAYMENT HANDLERS
bot.on("pre_checkout_query", async (ctx) => {
  console.log("✅ Pre-checkout query received");
  console.log("📦 Payload:", ctx.preCheckoutQuery.invoice_payload);
  
  try {
    const payload = JSON.parse(ctx.preCheckoutQuery.invoice_payload);
    
    // Validate it's a ticket purchase
    if (payload.type !== "ticket_purchase") {
      await ctx.answerPreCheckoutQuery(false, "Invalid purchase type");
      return;
    }

    // Check for duplicate (optional)
    const exists = await prisma.ticket.findUnique({ 
      where: { ticketId: payload.id } 
    });
    
    if (exists) {
      await ctx.answerPreCheckoutQuery(false, "Ticket already purchased");
      return;
    }

    // Approve the payment
    await ctx.answerPreCheckoutQuery(true);
    
  } catch (error) {
    console.error("❌ Pre-checkout error:", error);
    await ctx.answerPreCheckoutQuery(false, "Validation failed");
  }
});

bot.on("message:successful_payment", async (ctx) => {
  console.log("💰 Payment successful!");
  
  try {
    const payment = ctx.message.successful_payment;
    const payload = JSON.parse(payment.invoice_payload);
    
    console.log("📦 Processing payment:", payload);
    
    if (payload.type === "ticket_purchase") {
      // Reconstruct full data (using shortened keys)
      const ticketData = {
        ticketId: payload.id,
        telegramId: payload.tid,
        ticketType: payload.tt,
        quantity: payload.qty,
        totalCost: payload.cost,
        pricePerTicket: payload.ppt
      };
      
      // Check for duplicates again
      const exists = await prisma.ticket.findUnique({ 
        where: { ticketId: ticketData.ticketId } 
      });
      
      if (exists) {
        console.log("⚠️ Duplicate ticket prevented");
        await ctx.reply("⚠️ This ticket was already processed.");
        return;
      }
      
      // Create ticket in database
      const ticket = await prisma.ticket.create({
        data: {
          ticketId: ticketData.ticketId,
          telegramId: BigInt(ticketData.telegramId),
          userName: ctx.from.first_name || "User",
          ticketType: ticketData.ticketType,
          quantity: ticketData.quantity,
          paymentMethod: "stars",
          totalCost: ticketData.totalCost,
          pricePerTicket: ticketData.pricePerTicket,
          status: "pending"
        }
      });
      
      console.log("✅ Ticket created:", ticket.ticketId);
      
      // Send confirmation
      await ctx.reply(
        `✅ *Payment Successful!*\n\n` +
        `🎫 Ticket Type: ${ticketData.ticketType}\n` +
        `📦 Quantity: ${ticketData.quantity}x\n` +
        `💰 Total: ${ticketData.totalCost.toLocaleString()} Stars\n` +
        `🆔 Ticket ID: \`${ticketData.ticketId}\`\n\n` +
        `Status: Pending admin approval\n` +
        `You'll be notified once approved!`,
        { parse_mode: "Markdown" }
      );

      // Optional: Notify admin group
      const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_CHAT_ID;
      if (ADMIN_GROUP_ID) {
        await ctx.api.sendMessage(
          ADMIN_GROUP_ID,
          `🎫 *New Ticket Purchase*\n\n` +
          `User: ${ctx.from.first_name} (@${ctx.from.username || 'N/A'})\n` +
          `Type: ${ticketData.ticketType}\n` +
          `Quantity: ${ticketData.quantity}\n` +
          `Total: ${ticketData.totalCost} Stars\n` +
          `ID: \`${ticketData.ticketId}\`\n\n` +
          `Use /approve_ticket ${ticketData.ticketId} to approve`,
          { parse_mode: "Markdown" }
        );
      }
    }
  } catch (error) {
    console.error("❌ Payment processing error:", error);
    await ctx.reply("❌ Error processing payment. Please contact support.");
  }
});

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
    // { command: 'add_menu_item', description: 'Add a new menu item (Menu Manager)' },
    // { command: 'list_menu', description: 'List all menu items' },
    // { command: 'edit_menu_item', description: 'Edit a menu item (Menu Manager)' },
    // { command: 'delete_menu_item', description: 'Delete a menu item (Menu Manager)' },
    // Gym commands
    { command: 'add_gym_service', description: 'Add a new gym service (Gym Admin)' },
    // Admin commands
    { command: 'add_admin', description: 'Add a new admin (Super Admin)' },
    { command: 'list_admins', description: 'List all admins (Super Admin)' },
    // Super admin commands
    { command: 'broadcast', description: 'Broadcast message (Super Admin)' },
    // admin group commands
    { command: 'getgroupid', description: 'Get admin group id (Super Admin)' }
]).catch(error => {
    console.error('Failed to set commands:', error);
});

// Store fights and menu items being created/edited in memory

// Register the command
bot.command('listfighters', async (ctx) => {
  // Optional: Only allow admins to use this
  // if (!isAdmin(ctx.from.id)) return ctx.reply("Unauthorized");
  
  await handleListFighters(ctx);
});


// ======================
// RESTAURANT MENU COMMANDS - UPDATED WITH PARTNER SENSITIVITY
// ======================

// bot.command('add_menu_item', async (ctx) => {
//     if (await isSuperAdmin(ctx)) {
//         const partners = await prisma.partner.findMany({ where: { type: 'RESTAURANT' } });
//         if (partners.length === 0) return ctx.reply('❌ No restaurant partners found.');

//         const buttons = partners.map(partner => [{ text: partner.name, callback_data: `select_partner_menu:${partner.id}` }]);
//         return ctx.reply('🏢 Select a restaurant partner to add menu items for:', {
//             reply_markup: { inline_keyboard: buttons },
//         });
//     }

//     const adminPartner = await getAdminPartner(ctx);
//     if (!adminPartner || !(await isMenuManager(ctx, adminPartner.id))) {
//         return ctx.reply('❌ You do not have permission to manage menu items for this partner.');
//     }

//     const chatId = ctx.chat?.id;
//     if (chatId) {
//         menuItemCreation[chatId] = {
//             step: 'name',
//             partnerId: adminPartner.id,
//             partnerName: adminPartner.name,
//         };
//         ctx.reply(`🍽️ Let's add a new menu item for ${adminPartner.name}!
// \nPlease enter the item name:`);
//     }
// });

// // List all menu items
// bot.command('list_menu', async (ctx) => {
//     try {
//         let menuItems;
//         let partnerName = '';
//         const isSuper = await isSuperAdmin(ctx);
//         const adminPartner = await getAdminPartner(ctx);

//         if (isSuper) {
//             menuItems = await prisma.service.findMany({
//                 where: { type: 'ONE_TIME' },
//                 include: { partner: true },
//                 orderBy: { createdAt: 'desc' }
//             });
//         } else if (adminPartner && (await isMenuManager(ctx, adminPartner.id))) {
//             menuItems = await prisma.service.findMany({
//                 where: { type: 'ONE_TIME', partnerId: adminPartner.id },
//                 orderBy: { createdAt: 'desc' }
//             });
//             partnerName = ` for ${adminPartner.name}`;
//         } else {
//             // Public view fallback
//             menuItems = await prisma.service.findMany({
//                 where: { type: 'ONE_TIME' },
//                 include: { partner: true },
//                 orderBy: { createdAt: 'desc' }
//             });
//         }

//         if (menuItems.length === 0) {
//             ctx.reply(`📋 No menu items found${partnerName}.`);
//             return;
//         }

//         let message = `🍽️ **Menu Items${partnerName}:**\n\n`;
//         menuItems.forEach((item, index) => {
//             message += `${index + 1}. **${item.name}**\n`;
//             message += `   💰 Price: ${item.priceShells} Shells\n`;
//             if (item.partner && (!adminPartner || isSuper)) {
//                 message += `   🏢 Partner: ${item.partner.name}\n`;
//             }
//             message += `   📅 Added: ${item.createdAt.toLocaleDateString()}\n\n`;
//         });

//         ctx.reply(message, { parse_mode: 'Markdown' });
//     } catch (error) {
//         console.error('Error listing menu items:', error);
//         ctx.reply('❌ An error occurred while fetching menu items.');
//     }
// });




// // Edit menu item command
// bot.command('edit_menu_item', async (ctx) => {
//   const isSuper = await isSuperAdmin(ctx);
//   const adminPartner = isSuper ? null : await getAdminPartner(ctx);

//   if (!isSuper && !adminPartner) {
//     ctx.reply('❌ You must be associated with a partner to use this command.');
//     return;
//   }

//   if (!isSuper && !(await isMenuManager(ctx, adminPartner.id))) {
//     ctx.reply('❌ You do not have permission to manage menu items for this partner.');
//     return;
//   }

//   try {
//     let menuItems;
//     if (isSuper) {
//       menuItems = await prisma.service.findMany({
//         where: { type: 'ONE_TIME' },
//         include: { partner: true },
//         orderBy: { name: 'asc' }
//       });
//     } else {
//       menuItems = await prisma.service.findMany({
//         where: {
//           type: 'ONE_TIME',
//           partnerId: adminPartner.id
//         },
//         orderBy: { name: 'asc' }
//       });
//     }

//     if (menuItems.length === 0) {
//       ctx.reply('📋 No menu items to edit.');
//       return;
//     }

//     const buttons = menuItems.map(item => [
//       {
//         text: `${item.name} (${item.priceShells} Shells)`,
//         callback_data: `edit_menu:${item.id}`
//       }
//     ]);

//     ctx.reply(`📝 Select a menu item to edit:`, {
//       reply_markup: { inline_keyboard: buttons }
//     });
//   } catch (error) {
//     console.error('Error fetching menu items for editing:', error);
//     ctx.reply('❌ An error occurred while fetching menu items.');
//   }
// });



// // Delete menu item command
// bot.command('delete_menu_item', async (ctx) => {
//   const isSuper = await isSuperAdmin(ctx);
//   const adminPartner = isSuper ? null : await getAdminPartner(ctx);

//   if (!isSuper && !adminPartner) {
//     ctx.reply('❌ You must be associated with a partner to use this command.');
//     return;
//   }

//   if (!isSuper && !(await isMenuManager(ctx, adminPartner.id))) {
//     ctx.reply('❌ You do not have permission to manage menu items for this partner.');
//     return;
//   }

//   try {
//     let menuItems;
//     if (isSuper) {
//       menuItems = await prisma.service.findMany({
//         where: { type: 'ONE_TIME' },
//         include: { partner: true },
//         orderBy: { name: 'asc' }
//       });
//     } else {
//       menuItems = await prisma.service.findMany({
//         where: {
//           type: 'ONE_TIME',
//           partnerId: adminPartner.id
//         },
//         orderBy: { name: 'asc' }
//       });
//     }

//     if (menuItems.length === 0) {
//       ctx.reply('📋 No menu items to delete.');
//       return;
//     }

//     const buttons = menuItems.map(item => [
//       {
//         text: `❌ ${item.name} (${item.priceShells} Shells)`,
//         callback_data: `delete_menu:${item.id}`
//       }
//     ]);

//     ctx.reply(`🗑️ Select a menu item to delete:`, {
//       reply_markup: { inline_keyboard: buttons }
//     });
//   } catch (error) {
//     console.error('Error fetching menu items for deletion:', error);
//     ctx.reply('❌ An error occurred while fetching menu items.');
//   }
// });




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

export async function handleListFighters(ctx) {
  try {
    const fighters = await prisma.fighter.findMany({
      select: { 
        id: true, 
        name: true 
      }
    });

    if (fighters.length === 0) {
      return ctx.reply("No fighters found in the database.");
    }

    // Create the vertical list of buttons
    const keyboard = fighters.map((f) => [
      { text: `👤 ${f.name}`, callback_data: `check_f_${f.id}` }
    ]);

    await ctx.reply("🗂 **Fighter Management**\nSelect a fighter to check their status:", {
      parse_mode: 'Markdown',
      reply_markup: { 
        inline_keyboard: keyboard 
      }
    });
  } catch (error) {
    console.error("List Fighters Error:", error);
    ctx.reply("❌ Error fetching fighters.");
  }
}

// Helper to update fight result
/**
 * Resolves a fight and updates fighter statistics in a single transaction.
 * @param {string} fightId - The ID of the fight to resolve
 * @param {string} status - The new status (COMPLETED, DRAW, etc.)
 * @param {string} [winnerId] - The ID of the winner (optional)
 */

// This is required by Telegram to finalize the "Pay" button
bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

// This credits the 50/30 Commissions immediately after payment
bot.on("message:successful_payment", async (ctx) => {
  try {
    const payment = ctx.message.successful_payment;
    const payload = JSON.parse(payment.invoice_payload);

    const { fightId, fighterId, starsCount, shellEquivalent, telegramId } = payload;
    const shellAmount = BigInt(shellEquivalent);
    const userTelegramId = BigInt(telegramId);
    const stars = Number(starsCount);

    await prisma.$transaction(async (tx) => {
      // 1️⃣ Create the stake now that payment succeeded
      const stake = await tx.stake.create({
        data: {
          user: { connect: { telegramId: userTelegramId } },
          fight: { connect: { id: fightId } },
          fighter: { connect: { id: fighterId } },
          starsAmount: stars,
          stakeAmount: shellAmount,
          initialStakeAmount: shellAmount,
          stakeType: "STARS",
          status: "COMPLETED",
        },
      });

      // 2️⃣ Update fighter/manager commissions
      const fighter = await tx.fighter.findUnique({ where: { id: fighterId } });
      if (fighter?.ownerId) {
        const managerCut = (shellAmount * 50n) / 100n;
        await tx.user.update({
          where: { id: fighter.ownerId },
          data: { points: { increment: managerCut } },
        });
      }
      if (fighter?.userTelegramId) {
        const fighterCut = (shellAmount * 30n) / 100n;
        await tx.user.update({
          where: { telegramId: fighter.userTelegramId },
          data: { points: { increment: fighterCut } },
        });
      }
    });

    console.log(`✅ Stars stake successful for user ${telegramId}`);
  } catch (err) {
    console.error("❌ Stars payment processing failed:", err);
  }
});

async function resolveFight(fightId, status, winnerId) {
  const SEED = 100000; // The virtual shells added to each side for stability

  async function resolveFight(fightId, status, winnerId) {
  const SEED = 100000; // The virtual shells added to each side for stability

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch Fight data with all necessary relations
    const fight = await tx.fight.findUnique({
      where: { id: fightId },
      include: {
        stakes: true,
        fighter1: { include: { user: true } },
        fighter2: { include: { user: true } }
      }
    });

    if (!fight) throw new Error("Fight not found");

    // Initialize return data
    let mintedNftData = null;

    if (status === "COMPLETED" && winnerId) {
      // ✅ FIX: Only count stakes that were actually paid/finished
      const completedStakes = fight.stakes.filter(s => s.status === "COMPLETED");

      const isFighter1Winner = winnerId === fight.fighter1Id;
      const winner = isFighter1Winner ? fight.fighter1 : fight.fighter2;

      // ✅ FIX: Use completedStakes here
      const winningStakes = completedStakes.filter(s => s.fighterId === winnerId);

      // 2. Identify the "Loser Pile" (Profit)
      const loserStakesTotal = completedStakes
        .filter(s => s.fighterId !== winnerId)
        .reduce((sum, s) => sum + BigInt(s.stakeAmount), 0n);

      // 3. Performance Credits (10% Manager / 20% Fighter)
      const managerBonus = (loserStakesTotal * 10n) / 100n;
      const fighterBonus = (loserStakesTotal * 20n) / 100n;
      const stakerProfitPool = loserStakesTotal - managerBonus - fighterBonus;

      // 4. Multiplier Calculation
      const winnerStakesTotal = winningStakes.reduce((sum, s) => sum + BigInt(s.stakeAmount), 0n);
      const winnerSideDenominator = winnerStakesTotal + BigInt(SEED);
      const totalPayoutPool = winnerSideDenominator + stakerProfitPool;
      const scaledMultiplier = (totalPayoutPool * 10000n) / winnerSideDenominator;

      // 5. DISTRIBUTE POINTS
      if (winner.ownerId) {
        await tx.user.update({
          where: { id: winner.ownerId },
          data: { points: { increment: managerBonus } }
        });
      }

      if (winner.userTelegramId) {
        await tx.user.update({
          where: { telegramId: winner.userTelegramId },
          data: { points: { increment: fighterBonus } }
        });
      }

      // 6. PAY WINNING STAKERS
      for (const stake of winningStakes) {
        const payoutAmount = (BigInt(stake.stakeAmount) * scaledMultiplier) / 100n;
        await tx.stake.update({
          where: { id: stake.id },
          data: {
            outcome: "WIN",
            pointsEarned: payoutAmount,
            status: "COMPLETED",
            isClaimed: false
          }
        });
      }

      // 7. UPDATE FIGHTER STATS & REWARDS
      const updatedFighter = await tx.fighter.update({
        where: { id: winnerId },
        data: {
          wins: { increment: 1 },
          currentStreak: { increment: 1 }
        }
      });

      // --- REWARD A: FIGHTER STREAK (NFT) ---
      if (updatedFighter.currentStreak > 0 && updatedFighter.currentStreak % 3 === 0) {
        const rewardNft = await tx.nft.findFirst({
          where: { collectionId: winner.collectionId, isSold: false },
          orderBy: { priceStars: 'asc' }
        });

        if (rewardNft) {
          const recipientId = winner.isPrivate ? winner.ownerId : (winner.user?.id || null);
          if (recipientId) {
            const updatedNft = await tx.nft.update({
              where: { id: rewardNft.id },
              data: { isSold: true, ownerId: recipientId }
            });

            mintedNftData = {
              name: updatedNft.name,
              imageUrl: updatedNft.imageUrl,
              priceShells: updatedNft.priceShells || 0,
              rarity: updatedNft.rarity || "COMMON",
              collection: winner.collection?.name || "Polycombat"
            };
          }
        }
      }

      // --- REWARD B: TEAM MILESTONE (Airdrop) ---
      const collectionWins = await tx.fight.count({
        where: {
          winnerId: { not: null },
          OR: [
            { fighter1: { collectionId: winner.collectionId }, winnerId: fight.fighter1Id },
            { fighter2: { collectionId: winner.collectionId }, winnerId: fight.fighter2Id }
          ]
        }
      });

      if (collectionWins > 0 && collectionWins % 3 === 0) {
        const AIRDROP_AMOUNT = 50000n;
        const collectionHolders = await tx.nft.findMany({
          where: { collectionId: winner.collectionId, isSold: true },
          select: { ownerId: true }
        });
        const holderIds = [...new Set(collectionHolders.map(h => h.ownerId).filter(Boolean))];
        if (holderIds.length > 0) {
          await tx.user.updateMany({
            where: { id: { in: holderIds } },
            data: { points: { increment: AIRDROP_AMOUNT } }
          });
        }
      }
      // <--- THIS WAS THE MISSING BRACE
   } else if (status === "DRAW" || status === "CANCELLED") {
  for (const stake of fight.stakes) {
    // 1. Calculate the exact commissions that were paid out in the POST route
    const managerCut = (BigInt(stake.stakeAmount) * 50n) / 100n;
    const fighterCut = (BigInt(stake.stakeAmount) * 30n) / 100n;

    // 2. Refund the User
    await tx.user.update({
      where: { id: stake.userId },
      data: { points: { increment: BigInt(stake.stakeAmount) } }
    });

    // 3. CLAWBACK: Pull the points back from the Manager/Fighter
    const fighter = stake.fighterId === fight.fighter1Id ? fight.fighter1 : fight.fighter2;

    if (fighter.ownerId) {
      await tx.user.update({
        where: { id: fighter.ownerId },
        data: { points: { decrement: managerCut } }
      });
    }

    if (fighter.userTelegramId) {
      await tx.user.update({
        where: { telegramId: fighter.userTelegramId },
        data: { points: { decrement: fighterCut } }
      });
    }

    // 4. Update stake record
    await tx.stake.update({
      where: { id: stake.id },
      data: {
        outcome: status === "DRAW" ? "DRAW" : "CANCELLED",
        status: "COMPLETED"
      }
    });
  }
}

    // 8. CLOSE FIGHT & RETURN DATA
    const finishedFight = await tx.fight.update({
      where: { id: fightId },
      data: { status, winnerId: winnerId || null }
    });

    return {
      ...finishedFight,
      mintedNft: mintedNftData
    };
  });
}
}

// Save fighter to database
async function saveFighterToDatabase(fighterData) {
    try {
        if (!fighterData.telegramId) {
            throw new Error('Telegram ID is required to create a fighter.');
        }
        
        const existingFighter = await prisma.fighter.findUnique({
            where: { userTelegramId: BigInt(data.telegram_id) }
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
            weightClass: fighterData.weightClass,
            imageUrl: fighterData.imageUrl,
            // ✅ Use the correct schema field name:
            userTelegramId: fighterData.telegramId, 
            // ✅ Link the collection:
            collection: {
                connect: { id: fighterData.collectionId }
            },
            status: 'APPROVED' // Since an admin is creating this
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
            weightClass: data.weight_class,
            imageUrl: data.imageUrl || null,
            telegramId: BigInt(data.telegram_id),
            collectionId: data.collectionId
        };
        
        const fighter = await saveFighterToDatabase(fighterData);
        const collection = await prisma.collection.findUnique({ 
        where: { id: data.collectionId } 
        });
        
        await ctx.deleteMessage(loadingMsg.message_id);
        
        let message = `🎉 *Fighter Created Successfully!*\n\n` +
            `🆔 *Name:* ${fighter.name}\n` +
            `🎂 *Age:* ${fighter.age}\n` +
            `⚧️ *Gender:* ${fighter.gender}\n` +
            `📏 *Height:* ${fighter.height}m\n` +
            `⚖️ *Weight:* ${fighter.weight}kg\n` +
            `🥊 *Weight Class:* ${fighter.weightClass}kg\n` +
            `📱 *Telegram ID:* ${fighter.telegramId}\n`;
            `🏆 *Team:* ${collection?.name || 'None'}\n` +
        
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

async function getCollectionPrompt(ctx) {
    const collections = await prisma.collection.findMany(); // Fetch your teams
    const buttons = collections.map(c => ([{
        text: c.name,
        callback_data: `select_col:${c.id}`
    }]));

    return ctx.reply("🏷️ **Select a Team/Collection:**", {
        reply_markup: { inline_keyboard: buttons },
        parse_mode: 'Markdown'
    });
}


// Schedule a new fight (fight admin only)
bot.command('schedule_fight', async (ctx) => {
    if (!(await isFightManager(ctx)) && !(await isSuperAdmin(ctx))) {
        ctx.reply('❌ You do not have permission to use this command. This requires FIGHT_MANAGER or SUPERADMIN permission.');
        return;
    }

    const chatId = ctx.chat?.id;
    if (chatId) {
    newFights[chatId] = { step: 'title' };
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
            `6️⃣ Weight Class\n` +
            `7️⃣ Telegram ID\n` +
            `8️⃣ Photo (optional)\n\n` +
            `9️⃣ Collection (SmartSnails/Manchies)\n\n` +
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

bot.command('getgroupid', async (ctx) => {
  const chatId = ctx.chat.id;
  const chatType = ctx.chat.type;
  
  if (chatType === 'group' || chatType === 'supergroup') {
    await ctx.reply(
      `📋 *Group Information*\n\n` +
      `Group ID: \`${chatId}\`\n` +
      `Group Title: ${ctx.chat.title}\n` +
      `Type: ${chatType}\n\n` +
      `Copy the Group ID and add it to your .env file as:\n` +
      `ADMIN_GROUP_ID=${chatId}`,
      { parse_mode: 'Markdown' }
    );
  } else {
    await ctx.reply('❌ This command only works in groups!');
  }
});

// ✅ Approve Ticket

bot.action(/^approve_ticket_(.+)$/, async (ctx) => {
  const ticketId = ctx.match[1];
  const adminId = ctx.from.id.toString();

  const ticket = await prisma.ticket.update({
    where: { ticketId },
    data: {
      status: "approved",
      approvedDate: new Date(),
      approvedBy: adminId,
    },
  });

  // Send message to the user
  await ctx.api.sendMessage(
    ticket.telegramId.toString(),
    `✅ *Ticket Approved!*\n\nYour ${ticket.ticketType} ticket (${ticket.quantity}x) has been verified and approved!`,
    { parse_mode: "Markdown" }
  );

  // Replace buttons with confirmation text
  await ctx.editMessageText(
    `✅ Ticket ${ticketId} approved by @${ctx.from.username || "Admin"}`
  );
});


// ❌ Reject Ticket
bot.action(/^reject_ticket_(.+)$/, async (ctx) => {
  const ticketId = ctx.match[1];
  const adminId = ctx.from.id.toString();

  const ticket = await prisma.ticket.update({
    where: { ticketId },
    data: {
      status: "rejected",
      rejectedDate: new Date(),
      approvedBy: adminId,
    },
  });

  await ctx.api.sendMessage(
    ticket.telegramId.toString(),
    `❌ *Ticket Rejected*\n\nYour ${ticket.ticketType} ticket (${ticket.quantity}x) has been rejected.`,
    { parse_mode: "Markdown" }
  );

  await ctx.answerCallbackQuery({ text: "❌ Rejected" });
  await ctx.editMessageText(`❌ Ticket ${ticketId} rejected by @${ctx.from.username || "Admin"}`);
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

  // ==== SESSION INITIALIZATION ====
  ctx.session = ctx.session || {};

  // ==== FIGHTER CREATION FLOW ====
  if (ctx.session?.step && Object.values(FIGHTER_STEPS).includes(ctx.session.step)) {
    try {
      const currentStep = ctx.session.step;

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
        ctx.session.step = FIGHTER_STEPS.CONFIRM;
        const prompt = getStepPrompt(FIGHTER_STEPS.CONFIRM, ctx.session.data);
        return ctx.reply(`${prompt.text}`, { parse_mode: 'Markdown' });
      }

      if (currentStep !== FIGHTER_STEPS.CONFIRM && currentStep !== FIGHTER_STEPS.IMAGE) {
        const validator = validators[currentStep];
        if (!validator) return ctx.reply('❌ Invalid step. Use /cancel to restart.');

        const validation = validator(text);
        if (!validation.valid) {
          return ctx.reply(`❌ ${validation.error}\n\nPlease try again:`);
        }

        ctx.session.data[currentStep] = validation.value;

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
      console.error('Error in fighter flow:', error);
      ctx.session = {};
      return ctx.reply('❌ Something went wrong. Start over with /addfighter.');
    }

    return;
  }

  // ==== ADMIN CREATION ====
  if (ctx.session?.step === 'awaiting_admin_details' && await isSuperAdmin(ctx)) {
    // your admin logic here (same as your current)
    return;
  }

  // ==== OLD FIGHTER REGISTRATION ====
  if (ctx.session?.step === 'awaiting_details') {
    // your old fighter handler
    return;
  }

  // ==== MENU ITEM CREATION (with predefined images) ====
  if (menuItemCreation[chatId]) {
    const data = menuItemCreation[chatId];

    if (data.step === 'awaiting_name') {
      data.name = text;
      data.step = 'awaiting_price';
      return ctx.reply('💰 Enter the price in Shells:');
    }

    if (data.step === 'awaiting_price') {
      const price = parseInt(text);
      if (isNaN(price) || price <= 0) {
        return ctx.reply('⚠️ Invalid price. Please enter a number.');
      }

      data.price = price;
      data.step = 'awaiting_partner';
      return ctx.reply('🏢 Enter the Partner ID:');
    }

    if (data.step === 'awaiting_partner') {
      data.partnerId = text;
      data.step = 'selecting_image';

      return ctx.reply('🖼 Select an image for this menu item:', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🍛 Jollof Rice', callback_data: 'select_menu_image:jollof_rice.jpg' },
              { text: '🍗 Chicken Suya', callback_data: 'select_menu_image:chicken_suya.jpg' }
            ],
            [
              { text: '🍌 Fried Plantain', callback_data: 'select_menu_image:fried_plantain.jpg' }
            ]
          ]
        }
      });
    }

    return;
  }

  // ==== MENU ITEM EDITING ====
  if (menuItemCreation[chatId]?.step === 'edit_name') {
    // your edit name logic
    return;
  }

  if (menuItemCreation[chatId]?.step === 'edit_price') {
    // your edit price logic
    return;
  }

  // ==== FIGHT SCHEDULING ====
  // ==== FIGHT SCHEDULING ====
if (newFights[chatId] && await isFightManager(ctx)) {
  const fight = newFights[chatId];

  // Step 1: Expect fight title
  if (fight.step === 'title') {
    fight.title = text;
    fight.step = 'fighter1';

    try {
      const fighters = await prisma.fighter.findMany();
      if (!fighters || fighters.length < 2) {
        delete newFights[chatId];
        return ctx.reply('⚠️ Not enough fighters in the database to schedule a fight.');
      }

      const keyboard = fighters.map(f => [
        { text: f.name, callback_data: `select_fighter1:${f.id}` }
      ]);

      return ctx.reply('👤 Select Fighter 1:', { reply_markup: { inline_keyboard: keyboard } });
    } catch (err) {
      console.error('Error fetching fighters:', err);
      delete newFights[chatId];
      return ctx.reply('❌ Failed to fetch fighters.');
    }
  }

  // Step 4: After fighter selection, expect date/time
  if (fight.step === 'date') {
    const m = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
    if (!m) {
      return ctx.reply('❌ Invalid format. Use: YYYY-MM-DD HH:mm (24-hour)');
    }

    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const hour = parseInt(m[4], 10);
    const minute = parseInt(m[5], 10);

    const scheduledDate = new Date(year, month, day, hour, minute);
    if (isNaN(scheduledDate.getTime())) {
      return ctx.reply('❌ Invalid date/time. Try again.');
    }

    fight.date = scheduledDate;

    try {
      const createdFight = await prisma.fight.create({
        data: {
          title: fight.title,
          fighter1Id: fight.fighter1Id,
          fighter2Id: fight.fighter2Id,
          fightDate: fight.date,
          status: 'SCHEDULED',
        },
      });

      await ctx.reply(
        `✅ Fight scheduled!\n\n📌 *${createdFight.title}*\n👤 ${fight.fighter1Name} vs ${fight.fighter2Name}\n🗓️ ${fight.date.toLocaleString()}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('Error saving fight:', err);
      await ctx.reply('❌ Failed to save fight.');
    }

    delete newFights[chatId];
    return;
  }

  return;
}


  // ==== GYM SERVICE CREATION ====
  if (ctx.session?.step === 'awaiting_service_name') {
    ctx.session.serviceName = text.trim();
    ctx.session.step = 'awaiting_service_price';
    return ctx.reply('💰 Enter the price in Shells:');
  }

  if (ctx.session?.step === 'awaiting_service_price') {
    const price = parseInt(text.trim(), 10);
    if (isNaN(price) || price <= 0) {
      return ctx.reply('❌ Invalid price.');
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

      await ctx.reply(`✅ Service added: ${newService.name} - ${newService.priceShells} Shells`);
    } catch (error) {
      console.error('Error adding service:', error);
      await ctx.reply('❌ Failed to add service.');
    }

    ctx.session = {};
    return;
  }
});



// Handle photo uploads for fighter creation
bot.on('photo', async (ctx) => {
  console.log('🔍 Photo handler triggered');
  
  const photo = ctx.message.photo?.at(-1);
  if (!photo) {
    console.log('❌ No photo found in message');
    return;
  }

  console.log('📷 Photo details:', {
    file_id: photo.file_id,
    file_size: photo.file_size,
    width: photo.width,
    height: photo.height
  });

  // Check session exists and initialize if needed
  if (!ctx.session) {
    ctx.session = { step: null, data: null };
  }

  if (!ctx.session?.step || !ctx.session?.data) {
    console.log('❌ No session or wrong step');
    return ctx.reply('❌ No ongoing fighter registration. Please start with /addfighter.');
  }

  console.log('📊 Session state:', {
    step: ctx.session.step,
    hasData: !!ctx.session.data,
    userId: ctx.session.data?.telegram_id
  });

  // Step: Fighter Photo Upload
  if (ctx.session.step === FIGHTER_STEPS.IMAGE) {
    console.log('✅ Correct step for image upload');
    let loadingMsg;
    
    try {
      // Check file size first
      if (photo.file_size && photo.file_size > MAX_IMAGE_SIZE) {
        console.log('❌ File too large:', photo.file_size);
        return ctx.reply('❌ Image too large. Maximum size is 5MB. Please send a smaller image.');
      }

      console.log('🔄 Sending loading message...');
      loadingMsg = await ctx.reply('📸 Processing image...');
      console.log('✅ Loading message sent, ID:', loadingMsg.message_id);

      // Get file link with detailed logging
      console.log('🔗 Getting file link from Telegram...');
      let fileLink;
      try {
        fileLink = await ctx.telegram.getFileLink(photo.file_id);
        console.log('✅ File link obtained:', fileLink.href);
      } catch (fileLinkError) {
        console.error('❌ Error getting file link:', fileLinkError);
        throw new Error('Failed to get file link from Telegram');
      }

      // Download image with detailed logging
      console.log('⬇️ Downloading image from Telegram...');
      let response;
      try {
        response = await axios.get(fileLink.href, { 
          responseType: 'stream',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)'
          }
        });
        console.log('✅ Image download response received, status:', response.status);
        console.log('📊 Response headers:', response.headers);
      } catch (downloadError) {
        console.error('❌ Error downloading image:', downloadError);
        throw new Error('Failed to download image from Telegram');
      }

      // Check Cloudinary config before upload
      console.log('☁️ Cloudinary config check:', {
        cloud_name: cloudinary.config().cloud_name,
        api_key: cloudinary.config().api_key ? 'configured' : 'missing',
        api_secret: cloudinary.config().api_secret ? 'configured' : 'missing'
      });

      console.log('⬆️ Starting Cloudinary upload...');
      const cloudinaryUrl = await new Promise((resolve, reject) => {
        console.log('📤 Creating upload stream...');
        
        const uploadOptions = {
          folder: 'fighters',
          public_id: `fighter_${ctx.session.data.telegram_id}_${Date.now()}`,
          resource_type: 'auto',
          timeout: 60000,
        };
        
        console.log('⚙️ Upload options:', uploadOptions);
        
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('❌ Cloudinary upload error:', error);
              return reject(new Error(`Cloudinary upload failed: ${error.message}`));
            }
            if (!result || !result.secure_url) {
              console.error('❌ Cloudinary upload succeeded but no URL returned:', result);
              return reject(new Error('Cloudinary upload succeeded but no URL returned'));
            }
            console.log('✅ Cloudinary upload successful:', result.secure_url);
            resolve(result.secure_url);
          }
        );

        console.log('🔗 Piping response data to upload stream...');
        
        // Add stream event listeners for debugging
        response.data.on('data', (chunk) => {
          console.log('📊 Received chunk size:', chunk.length);
        });
        
        response.data.on('end', () => {
          console.log('✅ Stream ended successfully');
        });
        
        response.data.on('error', (streamError) => {
          console.error('❌ Stream error:', streamError);
          reject(new Error('Stream error during upload'));
        });

        uploadStream.on('error', (uploadError) => {
          console.error('❌ Upload stream error:', uploadError);
          reject(new Error('Upload stream error'));
        });

        // Pipe the response to cloudinary
        response.data.pipe(uploadStream);
      });

      console.log('💾 Storing image URL in session:', cloudinaryUrl);
      ctx.session.data.imageUrl = cloudinaryUrl;

      // Clean up loading message
      console.log('🧹 Cleaning up loading message...');
      try {
        await ctx.deleteMessage(loadingMsg.message_id);
        console.log('✅ Loading message deleted');
      } catch (deleteError) {
        console.log('⚠️ Could not delete loading message:', deleteError.message);
      }

      console.log('✅ Sending success message...');
      await ctx.reply('✅ Image uploaded successfully!');

      // Move to next step
      console.log('➡️ Moving to confirmation step...');
      ctx.session.step = FIGHTER_STEPS.CONFIRM;
      const prompt = getStepPrompt(FIGHTER_STEPS.CONFIRM, ctx.session.data);
      return ctx.reply(`${prompt.text}`, { parse_mode: 'Markdown' });

    } catch (error) {
      console.error('💥 MAIN ERROR CAUGHT:', error);
      console.error('📍 Error stack:', error.stack);
      console.error('🔍 Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        response: error.response?.status
      });
      
      // Clean up loading message if it exists
      if (loadingMsg) {
        try {
          await ctx.deleteMessage(loadingMsg.message_id);
          console.log('✅ Loading message deleted after error');
        } catch (deleteError) {
          console.log('⚠️ Could not delete loading message after error:', deleteError.message);
        }
      }

      // Provide specific error message
      let errorMessage = '❌ Failed to process image. ';
      
      if (error.message.includes('timeout')) {
        errorMessage += 'Upload timed out. ';
      } else if (error.message.includes('file link')) {
        errorMessage += 'Could not access image from Telegram. ';
      } else if (error.message.includes('Cloudinary')) {
        errorMessage += 'Image upload service error. ';
      } else if (error.message.includes('Stream')) {
        errorMessage += 'Image transfer error. ';
      } else {
        errorMessage += `Error: ${error.message}. `;
      }
      
      errorMessage += 'Type "skip" to continue without photo, or try again.';
      
      console.log('📤 Sending error message to user...');
      return ctx.reply(errorMessage);
    }
    return;
  }

  console.log('⚠️ Image received but not in image upload step');
  return ctx.reply('⚠️ Unexpected image. If you are not registering a fighter, ignore this.');
});

// Test Cloudinary connection (wrap in try-catch to prevent crashes)

console.log("🧪 Testing Cloudinary connection...");
try {
  const result = await cloudinary.api.ping();
  console.log("✅ Cloudinary connection test successful:", result);
} catch (error) {
  console.error("❌ Cloudinary ping setup failed:", error);
}

// Add skip handler
bot.hears(/^skip$/i, async (ctx) => {
  console.log('⏭️ Skip command received');
  
  // Initialize session if it doesn't exist
  if (!ctx.session) {
    ctx.session = { step: null, data: null };
  }
  
  if (!ctx.session?.step || !ctx.session?.data) {
    console.log('❌ No session for skip');
    return ctx.reply('❌ No ongoing registration to skip.');
  }

  if (ctx.session.step === FIGHTER_STEPS.IMAGE) {
    console.log('✅ Skipping image step');
    ctx.session.data.imageUrl = null;
    ctx.session.step = FIGHTER_STEPS.CONFIRM;
    
    const prompt = getStepPrompt(FIGHTER_STEPS.CONFIRM, ctx.session.data);
    return ctx.reply(`📸 Image skipped.\n\n${prompt.text}`, { parse_mode: 'Markdown' });
  }
  
  console.log('⚠️ Skip called but not in image step');
  return ctx.reply('⚠️ Nothing to skip at this step.');
});


// Also add this helper function to handle skip functionality
// bot.hears(/^skip$/i, async (ctx) => {
//   if (!ctx.session?.step || !ctx.session?.data) {
//     return ctx.reply('❌ No ongoing registration to skip.');
//   }

//   if (ctx.session.step === FIGHTER_STEPS.IMAGE) {
//     ctx.session.data.imageUrl = null; // or a default image URL
//     ctx.session.step = FIGHTER_STEPS.CONFIRM;
    
//     const prompt = getStepPrompt(FIGHTER_STEPS.CONFIRM, ctx.session.data);
//     return ctx.reply(`📸 Image skipped.\n\n${prompt.text}`, { parse_mode: 'Markdown' });
//   }
  
//   return ctx.reply('⚠️ Nothing to skip at this step.');
// });



// ======================
// CALLBACK QUERY HANDLERS
// ======================

bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const chatId = ctx.chat?.id;
  if (!data || !chatId) return;

  try {

    // === FIGHTER AUDIT / TEAM ASSIGNMENT (Your new logic) ===
    if (data.startsWith('check_f_')) {
      await ctx.answerCbQuery();
      const fighterId = data.split('_')[2];
      const fighter = await prisma.fighter.findUnique({
        where: { id: fighterId },
        include: { collection: true }
      });

      const status = fighter.collection 
        ? `✅ Team: *${fighter.collection.name}*` 
        : "⚠️ *No Collection Assigned*";

      return await ctx.editMessageText(`👤 *${fighter.name}*\nStatus: ${status}`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🔴 Set SmartSnail", callback_data: `set_team_${fighterId}_SmartSnail` },
              { text: "🔵 Set Manchies", callback_data: `set_team_${fighterId}_Manchies` }
            ],
            [{ text: "⬅️ Back to List", callback_data: "refresh_list" }]
          ]
        }
      });
    }

    if (data.startsWith('set_team_')) {
      const [,, fighterId, teamName] = data.split('_');
      const collection = await prisma.collection.findUnique({ where: { name: teamName } });

      await prisma.fighter.update({
        where: { id: fighterId },
        data: { collectionId: collection.id }
      });

      await ctx.answerCbQuery(`Updated to ${teamName}!`);
      return await ctx.editMessageText(`✅ Success: ${teamName} assigned to fighter.`);
    }

    if (data === "refresh_list") {
      await ctx.answerCbQuery();
      return handleListFighters(ctx); // Call your list function here
    }
    // === MENU ITEM IMAGE SELECTION ===
    if (data.startsWith('select_menu_image:')) {
      const selectedFileName = data.split(':')[1];
      const menuItem = menuItemCreation[chatId];

      if (!menuItem || !menuItem.name || !menuItem.price || !menuItem.partnerId) {
        return ctx.editMessageText('❌ Incomplete menu item data. Please start over.');
      }

      const newMenuItem = await prisma.service.create({
        data: {
          name: menuItem.name,
          priceShells: menuItem.price,
          type: 'ONE_TIME',
          partnerId: menuItem.partnerId,
          imageUrl: `/menus/${selectedFileName}`,
        },
      });

      await ctx.editMessageText(
        `✅ Menu item added!\n\n🍽️ *${newMenuItem.name}*\n💰 Price: ${newMenuItem.priceShells} Shells\n🖼 Image: ${selectedFileName}`,
        { parse_mode: 'Markdown' }
      );

      delete menuItemCreation[chatId];
      return;
    }

    // === MENU EDITING ===
    if (data.startsWith('edit_menu:')) {
      if (!(await isRestaurantAdmin(ctx))) {
        return ctx.answerCbQuery('❌ You do not have permission to edit menu items.');
      }

      const itemId = data.split(':')[1];
      const menuItem = await prisma.service.findUnique({
        where: { id: itemId },
        include: { partner: true },
      });

      const admin = await prisma.admin.findUnique({
        where: { telegramId: BigInt(ctx.from.id) },
        include: { partner: true },
      });

      if (!menuItem || menuItem.partnerId !== admin?.partnerId) {
        return ctx.answerCbQuery('❌ You do not have permission to access this item.');
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
      return;
    }

    if (data.startsWith('edit_name:') || data.startsWith('edit_price:')) {
      const itemId = data.split(':')[1];
      menuItemCreation[chatId] = {
        step: data.startsWith('edit_name:') ? 'edit_name' : 'edit_price',
        itemId,
      };
      const prompt = data.startsWith('edit_name:')
        ? '📝 Please enter the new name for this menu item:'
        : '💰 Please enter the new price in Shells (numbers only):';
      await ctx.editMessageText(prompt);
      return;
    }

    if (data.startsWith('delete_menu:')) {
      if (!(await isRestaurantAdmin(ctx))) {
        return ctx.answerCbQuery('❌ You do not have permission to delete menu items.');
      }

      const itemId = data.split(':')[1];
      const menuItem = await prisma.service.findUnique({
        where: { id: itemId },
        include: { partner: true },
      });

      const admin = await prisma.admin.findUnique({
        where: { telegramId: BigInt(ctx.from.id) },
        include: { partner: true },
      });

      if (!menuItem || menuItem.partnerId !== admin?.partnerId) {
        return ctx.answerCbQuery('❌ You do not have permission to access this item.');
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
      return;
    }

    if (data.startsWith('confirm_delete:')) {
      const itemId = data.split(':')[1];
      const menuItem = await prisma.service.findUnique({
        where: { id: itemId },
        include: { partner: true },
      });

      const admin = await prisma.admin.findUnique({
        where: { telegramId: BigInt(ctx.from.id) },
        include: { partner: true },
      });

      if (!menuItem || menuItem.partnerId !== admin?.partnerId) {
        return ctx.answerCbQuery('❌ You do not have permission to access this item.');
      }

      await prisma.service.delete({ where: { id: itemId } });

      await ctx.editMessageText(`✅ **Menu item deleted successfully!**\n\n🗑️ Deleted: **${menuItem.name}**`, {
        parse_mode: 'Markdown',
      });
      return;
    }

    if (data === 'cancel_edit' || data === 'cancel_delete') {
      await ctx.editMessageText('❌ Operation cancelled.');
      return;
    }

    // === FIGHT CALLBACKS (SCHEDULING) ===
if (data.startsWith('select_fighter1:')) {
  await ctx.answerCbQuery(); // ✅ ACK IMMEDIATELY

  const fighterId = data.split(':')[1];

  const fighter = await prisma.fighter.findUnique({
    where: { id: fighterId },
  });

  if (!fighter) {
    return ctx.editMessageText('❌ Fighter not found.');
  }

  const fight = newFights[chatId];
  if (!fight) return;

  fight.fighter1Id = fighter.id;
  fight.fighter1Name = fighter.name;
  fight.step = 'fighter2';

  const fighters = await prisma.fighter.findMany({
    where: { id: { not: fighter.id } },
  });

  const keyboard = fighters.map(f => [
    { text: f.name, callback_data: `select_fighter2:${f.id}` },
  ]);

  return ctx.editMessageText('👤 Select Fighter 2:', {
    reply_markup: { inline_keyboard: keyboard },
  });
}




if (data.startsWith('select_fighter2:')) {
  await ctx.answerCbQuery(); // ✅ ACK IMMEDIATELY

  const fighterId = data.split(':')[1];

  const fighter = await prisma.fighter.findUnique({
    where: { id: fighterId },
  });

  if (!fighter) {
    return ctx.editMessageText('❌ Fighter not found.');
  }

  const fight = newFights[chatId];
  if (!fight) return;

  fight.fighter2Id = fighter.id;
  fight.fighter2Name = fighter.name;
  fight.step = 'date';

  return ctx.editMessageText(
    `📅 Now enter the fight date & time in format:\n\nYYYY-MM-DD HH:mm\n\nExample: 2025-09-30 18:30`
  );
}


// ticket callback
// if (update.callback_query?.data?.startsWith('approve_ticket_')) {
//   const ticketId = update.callback_query.data.replace('approve_ticket_', '');
//   const adminId = update.callback_query.from.id.toString();
  
//   const ticket = await prisma.ticket.update({
//     where: { ticketId },
//     data: { 
//       status: 'approved',
//       approvedDate: new Date(),
//       approvedBy: adminId
//     }
//   });

//   // Notify user
//   await axios.post(
//     `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
//     {
//       chat_id: ticket.telegramId.toString(),
//       text: `✅ *Ticket Approved!*\n\nYour ${ticket.ticketType} ticket (${ticket.quantity}x) has been verified and approved!\n\nYou can now show your verified ticket at the event.`,
//       parse_mode: 'Markdown'
//     }
//   );
// }


    // === FIGHT CALLBACKS ===
    if (data.startsWith('resolve:')) {
  const fightId = data.split(':')[1]; // keep as string
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
  return;
}

if (data.startsWith('resolve_win:')) {
  const [_, fightIdStr, winnerIdStr] = data.split(':');
  
  // Optional: Fetch winner name to show in the confirmation
  const winner = await prisma.fighter.findUnique({ where: { id: winnerIdStr } });
  
  await resolveFight(fightIdStr, 'COMPLETED', winnerIdStr); 
  await ctx.editMessageText(`✅ Fight resolved. Winner: **${winner.name}**. Payouts and bonuses distributed.`);
  return;
}

if (data.startsWith('resolve_draw:')) {
  const fightId = data.split(':')[1];
  await resolveFight(fightId, 'DRAW');
  await ctx.editMessageText('🤝 Fight marked as a draw.');
  return;
}

if (data.startsWith('resolve_cancel:')) {
  const fightId = data.split(':')[1];
  await resolveFight(fightId, 'CANCELLED');
  await ctx.editMessageText('❌ Fight has been cancelled.');
  return;
}


    await ctx.answerCbQuery(); // Fallback catch-all
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