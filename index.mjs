import { Bot } from "grammy";

const bot = new Bot("7207012544:AAGo_-AlDzkhJX3yfx8SD6CL7ZOEtJHBIkM"); // <-- put your bot token between the ""

bot.command("start", (ctx) => ctx.reply("Welcome! Up and running."));

bot.start();