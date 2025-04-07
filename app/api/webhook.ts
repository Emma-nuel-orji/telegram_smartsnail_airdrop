// api/webhook.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { bot } from '@/bot/bot';


export const config = {
  api: {
    bodyParser: false, // important!
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Handle Telegram update
    await bot.handleUpdate(req.body);
    res.status(200).end();
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
