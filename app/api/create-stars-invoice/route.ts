// app/api/create-stars-invoice/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { planId, userId, priceStars } = await req.json();

    // You would typically call the Telegram Bot API 'createInvoiceLink' here
    // Replace BOT_TOKEN and other details with your actual bot config
    const BOT_TOKEN = process.env.BOT_TOKEN;
    
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `SageCombat: ${planId}`,
        description: `Enrollment for ${planId} training plan`,
        payload: `user_${userId}_plan_${planId}`,
        provider_token: "", // Empty for Telegram Stars
        currency: "XTR",    // XTR is the currency code for Stars
        prices: [{ label: "Training", amount: priceStars }] // Amount in Stars
      })
    });

    const data = await response.json();
    
    if (data.ok) {
      return NextResponse.json({ success: true, invoiceLink: data.result });
    } else {
      throw new Error(data.description);
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}