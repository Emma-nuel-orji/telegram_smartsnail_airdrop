import crypto from 'crypto';

interface TelegramInitData {
  query_id?: string;
  user?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  };
  auth_date: number;
  hash: string;
}

export function validateTelegramWebAppData(initData: string): TelegramInitData | null {
  try {
    // Parse the initData string into an object
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const params = Array.from(urlParams.entries())
      .filter(([key]) => key !== 'hash')
      .sort(([a], [b]) => a.localeCompare(b));

    // Create the data check string
    const dataCheckString = params
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Get your bot token from environment variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('BOT_TOKEN not configured');
    }

    // Create the secret key
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    // Calculate the hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Validate the hash
    if (calculatedHash !== hash) {
      return null;
    }

    // Convert the params into an object
    const data: any = {};
    for (const [key, value] of params) {
      if (key === 'user') {
        data.user = JSON.parse(value);
      } else {
        data[key] = value;
      }
    }

    return data as TelegramInitData;
  } catch (error) {
    console.error('Error validating Telegram data:', error);
    return null;
  }
}