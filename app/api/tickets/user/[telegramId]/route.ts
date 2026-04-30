import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { telegramId: string } }
) {
  try {
    const auth = await authenticateTelegramUser(req);
    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Only allow users to fetch their own tickets
    if (auth.telegramId.toString() !== params.telegramId) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const tickets = await prisma.ticket.findMany({
      where: { telegramId: auth.telegramId },
      orderBy: { purchaseDate: 'desc' }
    });

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

    return NextResponse.json({ success: true, tickets: formattedTickets });

  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch tickets' }, { status: 500 });
  }
}