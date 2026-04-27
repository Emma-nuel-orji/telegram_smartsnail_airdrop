import crypto from "crypto";

export function verifyTelegram(initData: string) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;

  const secret = crypto
    .createHash("sha256")
    .update(BOT_TOKEN)
    .digest();

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) return { valid: false, user: null };

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  let user = null;

  try {
    user = params.get("user")
      ? JSON.parse(params.get("user")!)
      : null;
  } catch {}

  return {
    valid: hmac === hash,
    user,
  };
}