// scripts/setWebhook.ts
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

async function setWebhook() {
  const webhookUrl = "https://telegram-smartsnail-airdrop.vercel.app/api/telegram/webhook"; // <- update this!
  await bot.telegram.setWebhook(webhookUrl);
  console.log(`Webhook set to ${webhookUrl}`);
}

setWebhook();
