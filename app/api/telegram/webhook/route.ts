// app/api/telegram/webhook/route.ts
import { bot } from "@/lib/bot";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await bot.handleUpdate(body);
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  return new Response("OK", { status: 200 });
}
