import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { prisma } from '@/prisma/client';
import { sendPurchaseEmail } from "@/src/utils/emailUtils";

const TELEGRAM_BOT_TOKEN = process.env.BOT_API;
const PROVIDER_TOKEN = process.env.PROVIDER_TOKEN; // Add this to your env variables

if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set in the environment variables");
}

const api = axios.create({
  baseURL: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/`,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const {
      email,
      title,
      description,
      amount,
      label,
      bookCount,
      fxckedUpBagsQty,
      humanRelationsQty,
      telegramId,
      referrerId,
      totalTappingRate,
      totalPoints,
    } = req.body;

    // Enhanced input validation
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    if (!bookCount || bookCount < 1 || !amount || amount < 0) {
      return res.status(400).json({ error: "Invalid purchase details" });
    }

    // Create payload for Telegram payment
    const payload = JSON.stringify({
      email,
      bookCount,
      fxckedUpBagsQty,
      humanRelationsQty,
      telegramId,
      referrerId,
      totalTappingRate,
      totalPoints,
    });

    // Create Telegram payment invoice
    const paymentResponse = await api.post('createInvoiceLink', {
      title,
      description,
      payload,
      provider_token: PROVIDER_TOKEN,
      currency: "XTR", // XTR represents Stars in Telegram
      prices: [{ 
        amount: Number(amount),
        label 
      }],
      need_email: true, // Request email from user during payment
    });

    if (!paymentResponse.data.result) {
      throw new Error("Failed to create payment invoice");
    }

    // Store pending transaction in database
    const validOrderId = await prisma.order.findFirst({
      where: { status: "PENDING" }, // Find a pending order
    });
    
    if (!validOrderId) {
      throw new Error("Valid order ID not found.");
    }
    
    await prisma.pendingTransaction.create({
      data: {
        email,
        amount,
        bookCount,
        fxckedUpBagsQty,
        humanRelationsQty,
        telegramId,
        referrerId,
        totalTappingRate,
        totalPoints,
        payloadData: payload,
        status: "PENDING",
        order: {
          connect: { id: validOrderId.id }, // Use the fetched valid order ID
        },
      },
    });
    

    // Return the invoice link to the frontend
    res.status(200).json({ 
      invoiceLink: paymentResponse.data.result
    });

  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    });
  }
}
