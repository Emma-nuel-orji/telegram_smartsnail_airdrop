import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requesterId = searchParams.get('adminId');

    if (!requesterId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    // 1. Fetch the Admin and check their permissions/partner
    const admin = await prisma.admin.findUnique({
      where: { telegramId: BigInt(requesterId) },
      select: { permissions: true, partnerId: true }
    });

    if (!admin) return NextResponse.json({ error: 'Not an Admin' }, { status: 401 });

    // 2. Build the Filter
    let filter: any = { status: 'ACTIVE' };

    // If NOT a SuperAdmin, restrict results to their specific partnerId
    if (!admin.permissions.includes('SUPERADMIN')) {
      if (!admin.partnerId) return NextResponse.json({ error: 'No Partner Assigned' }, { status: 403 });
      
      // Filter for subscriptions belonging to the Admin's partner
      filter.partnerId = admin.partnerId;
    }

    // 3. Fetch Data
    const subscriptions = await prisma.subscription.findMany({
      where: {
        ...filter,
        user: { isNot: null } // 👈 Add this line!
      },
      include: {
        user: { 
          select: { firstName: true, username: true, nickname: true } 
        }
      },
      orderBy: { startDate: 'desc' }
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}