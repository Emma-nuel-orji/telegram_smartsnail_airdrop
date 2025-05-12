import { NextRequest } from "next/server";
import { Telegraf } from "telegraf";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);


bot.command("start", (ctx) => {
  ctx.reply("Hello from Vercel webhook!");
});

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    await bot.handleUpdate(body);
  } catch (err) {
    console.error("Telegram webhook error:", err);
  }

  return new Response("OK", { status: 200 });
}
