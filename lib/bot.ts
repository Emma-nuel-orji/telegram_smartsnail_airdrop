// lib/bot.ts
import { Telegraf, session } from "telegraf";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
const prisma = new PrismaClient();

bot.use(session());

// Your commands & handlers here
bot.command("start", async (ctx) => {
  try {
    const telegramId = BigInt(ctx.from!.id); // or Number(ctx.from!.id)

const user = await prisma.user.upsert({
  where: { telegramId },
  update: {},
  create: {
    telegramId,
    firstName: ctx.from!.first_name,
    username: ctx.from!.username || null,
  },
});

    await ctx.reply(`Welcome ${user.firstName}!`);
  } catch (err) {
    console.error("start command error:", err);
    await ctx.reply("Something went wrong.");
  }
});

bot.on("callback_query", async (ctx) => {
    const callback = ctx.callbackQuery;
  
    if (callback && "data" in callback) {
      const data = callback.data;
  
      try {
        switch (data) {
          case "example_action":
            await ctx.reply("You chose example_action!");
            break;
          default:
            await ctx.answerCbQuery("Unknown action.");
        }
      } catch (err) {
        console.error("Callback error:", err);
        await ctx.answerCbQuery("An error occurred.");
      }
    } else {
      await ctx.answerCbQuery("Invalid action.");
    }
  });
  

export { bot };
