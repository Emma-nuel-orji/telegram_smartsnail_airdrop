import crypto from "crypto";

export function verifyTelegram(initData: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

  // Telegram's official protocol: Secret = HMAC-SHA256(key="WebAppData", msg=BOT_TOKEN)
  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { valid: false, user: null };

  params.delete("hash");

  // Alphabetical sort is required by Telegram
  const dataCheckString = Array.from(params.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  let user = null;
  try {
    user = params.get("user") ? JSON.parse(params.get("user")!) : null;
  } catch {}

  // Verify hash and ensure data isn't older than 24 hours (security best practice)
  const authDate = parseInt(params.get("auth_date") || "0");
  const isRecent = (Date.now() / 1000) - authDate < 86400;

  return {
    valid: hmac === hash && isRecent,
    user,
  };
}