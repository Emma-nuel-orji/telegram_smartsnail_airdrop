// scripts/setWebhook.ts
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL || "https://telegram-smartsnail-airdrop.vercel.app/api/telegram/webhook";

if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not defined in environment variables");
  process.exit(1);
}

console.log(`Setting webhook for bot to URL: ${WEBHOOK_URL}`);

const bot = new Telegraf(TOKEN);

// Delete any existing webhook first to avoid conflicts
bot.telegram.deleteWebhook()
  .then(() => {
    console.log("Deleted existing webhook");
    
    // Set webhook with proper configuration
    return bot.telegram.setWebhook(WEBHOOK_URL, {
      drop_pending_updates: true, // Optional: drop any pending updates
      allowed_updates: ['message', 'callback_query', 'inline_query'] // Only receive these update types
    });
  })
  .then(() => {
    console.log(`Webhook successfully set to: ${WEBHOOK_URL}`);
    
    // Get webhook info to verify
    return bot.telegram.getWebhookInfo();
  })
  .then((info) => {
    console.log("Webhook info:", info);
    
    if (info.url !== WEBHOOK_URL) {
      console.warn(`Warning: Webhook URL mismatch. Expected: ${WEBHOOK_URL}, Actual: ${info.url}`);
    }
    
    if (info.pending_update_count > 0) {
      console.log(`There are ${info.pending_update_count} pending updates`);
    }
    
    if (info.last_error_date) {
      const errorDate = new Date(info.last_error_date * 1000);
      console.error(`Last webhook error: ${info.last_error_message} at ${errorDate.toISOString()}`);
    }
    
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed to set webhook:", err);
    process.exit(1);
  });