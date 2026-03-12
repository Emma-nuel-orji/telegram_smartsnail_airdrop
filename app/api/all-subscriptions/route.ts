import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    // In a real Telegram environment, you'd verify the initData header here.
    // For now, we check a custom header or query param for the Admin ID.
    const { searchParams } = new URL(req.url);
    const requesterId = searchParams.get('adminId');
    
    if (requesterId !== process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_ID) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSubs = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: {
          select: { firstName: true, username: true }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    return NextResponse.json(activeSubs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
  }
}