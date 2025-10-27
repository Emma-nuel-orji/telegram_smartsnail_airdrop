import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegramId, userName, ticketType, quantity, paymentMethod, totalCost, pricePerTicket } = body;

    // Validate inputs
    if (!telegramId || !ticketType || !quantity || !totalCost) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create pending ticket record
    const ticket = await prisma.ticket.create({
      data: {
        ticketId,
        telegramId: BigInt(telegramId),
        userName,
        ticketType,
        quantity,
        paymentMethod: 'stars',
        totalCost,
        pricePerTicket,
        status: 'pending'
      }
    });

    // Create Telegram Stars invoice
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const invoicePayload = {
      title: `${ticketType} Ticket - ${quantity}x`,
      description: `Event ticket purchase for ${userName}`,
      payload: JSON.stringify({ 
        ticketId,
        telegramId,
        type: 'ticket_purchase'
      }),
      currency: 'XTR',
      prices: [{ label: `${ticketType} Ticket`, amount: totalCost }]
    };

    const invoiceResponse = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      invoicePayload
    );

    if (!invoiceResponse.data.ok) {
      throw new Error('Failed to create invoice');
    }

    return NextResponse.json({
      success: true,
      invoiceLink: invoiceResponse.data.result,
      ticketId
    });

  } catch (error: any) {
    console.error('Stars purchase error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}