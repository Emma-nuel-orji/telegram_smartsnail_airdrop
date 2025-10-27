import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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

    // Find user and check balance
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (Number(user.points) < totalCost) {
      return NextResponse.json(
        { success: false, message: 'Insufficient shell balance' },
        { status: 400 }
      );
    }

    // Generate unique ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create ticket and update user balance in transaction
    const [ticket, updatedUser] = await prisma.$transaction([
      prisma.ticket.create({
        data: {
          ticketId,
          telegramId: BigInt(telegramId),
          userName,
          ticketType,
          quantity,
          paymentMethod: 'shells',
          totalCost,
          pricePerTicket,
          status: 'pending'
        }
      }),
      prisma.user.update({
        where: { telegramId: BigInt(telegramId) },
        data: { points: { decrement: BigInt(totalCost) } }
      })
    ]);

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketId: ticket.ticketId,
        ticketType: ticket.ticketType,
        quantity: ticket.quantity,
        paymentMethod: ticket.paymentMethod,
        totalCost: ticket.totalCost,
        status: ticket.status,
        purchaseDate: ticket.purchaseDate
      },
      newBalance: Number(updatedUser.points)
    });

  } catch (error: any) {
    console.error('Shell purchase error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}