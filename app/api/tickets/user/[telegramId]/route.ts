import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { telegramId: string } }
) {
  try {
    const { telegramId } = params;

    if (!telegramId) {
      return NextResponse.json(
        { success: false, message: 'Telegram ID is required' },
        { status: 400 }
      );
    }

    const tickets = await prisma.ticket.findMany({
      where: { telegramId: BigInt(telegramId) },
      orderBy: { purchaseDate: 'desc' }
    });

    // Format tickets for frontend
    const formattedTickets = tickets.map(ticket => ({
      id: ticket.id,
      ticketId: ticket.ticketId,
      ticketType: ticket.ticketType,
      quantity: ticket.quantity,
      paymentMethod: ticket.paymentMethod,
      totalCost: ticket.totalCost,
      status: ticket.status,
      purchaseDate: ticket.purchaseDate.toISOString()
    }));

    return NextResponse.json({ 
      success: true, 
      tickets: formattedTickets 
    });

  } catch (error: any) {
    console.error('Fetch tickets error:', error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}