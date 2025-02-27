import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { prisma } from '@/prisma/client';
import { sendPurchaseEmail } from "@/src/utils/emailUtils";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PROVIDER_TOKEN = process.env.PROVIDER_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set in the environment variables");
}

const api = axios.create({
  baseURL: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/`,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      tappingRate,
      totalPoints,
    } = body;

    // Enhanced input validation
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!bookCount || bookCount < 1 || !amount || amount < 0) {
      return NextResponse.json({ error: "Invalid purchase details" }, { status: 400 });
    }

    // Create payload for Telegram payment
    const payload = JSON.stringify({
      email,
      bookCount,
      fxckedUpBagsQty,
      humanRelationsQty,
      telegramId,
      referrerId,
      tappingRate,
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
        tappingRate,
        totalPoints,
        payloadData: payload,
        status: "PENDING",
        order: {
          connect: { id: validOrderId.id }, // Use the fetched valid order ID
        },
      },
    });

    // Return the invoice link to the frontend
    return NextResponse.json({ 
      invoiceLink: paymentResponse.data.result
    });

  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    }, { status: 500 });
  }
}