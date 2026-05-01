import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateTelegramUser(req);
    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const telegramId = auth.telegramId;
    const body = await req.json();
    const { ticketType, quantity } = body;

    if (!ticketType || !quantity) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Fetch ticket price from DB — never trust client
    const ticketConfig = await prisma.ticketType.findUnique({
      where: { name: ticketType }
    });

    if (!ticketConfig) {
      return NextResponse.json({ success: false, message: 'Invalid ticket type' }, { status: 400 });
    }

    // Calculate price server-side
    const totalCost = Number(ticketConfig.priceShells) * quantity;

    // Replace the transaction block with this:

// Get user name from DB using verified telegramId
const user = await prisma.user.findUnique({
  where: { telegramId },
  select: { firstName: true, lastName: true, username: true,  points: true  }
});

if (!user) {
  return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
}

if (Number(user.points) < totalCost) {
  return NextResponse.json({ success: false, message: 'Insufficient shell balance' }, { status: 400 });
}

// Build display name from DB — never from client
const userName = user.firstName 
  ? `${user.firstName} ${user.lastName || ''}`.trim() 
  : user.username || 'Player';

const ticketId = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const [ticket, updatedUser] = await prisma.$transaction([
  prisma.ticket.create({
    data: {
      ticketId,
      telegramId,
      userName,        // ← from DB, not client
      ticketType,
      quantity,
      paymentMethod: 'shells',
      totalCost,
      pricePerTicket: ticketConfig.priceShells,
      status: 'purchased'
    }
  }),
  prisma.user.update({
    where: { telegramId },
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
        purchaseDate: ticket.purchaseDate.toISOString()
      },
      newBalance: Number(updatedUser.points)
    });

  } catch (error) {
    return NextResponse.json({ success: false, message: 'Purchase failed' }, { status: 500 });
  }
}