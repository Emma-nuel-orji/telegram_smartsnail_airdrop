export const runtime = "nodejs";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  console.log("Webhook endpoint called");

  try {
    const body = await req.json();
    console.log("Webhook received body:", JSON.stringify(body));

    // ✅ lazy-load bot at runtime, not at build
    const { bot } = await import("@/lib/bot");

    await bot.handleUpdate(body);
    console.log("Update handled successfully");
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  // Always return OK to prevent Telegram from retrying
  return new Response("OK", { status: 200 });
}

// Optional - add a GET handler for testing the webhook
export async function GET() {
  return new Response("Telegram webhook is active", { status: 200 });
}
