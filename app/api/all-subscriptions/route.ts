import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requesterId = searchParams.get('adminId');
    if (!requesterId) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const admin = await prisma.admin.findUnique({
      where: { telegramId: BigInt(requesterId) }
    });

    if (!admin) return NextResponse.json({ error: 'Not an Admin' }, { status: 401 });

    let filter: any = { 
      status: 'ACTIVE',
      user: { isNot: null } // 🛡️ Protects against the "got null" error
    };

    if (!admin.permissions.includes('SUPERADMIN')) {
      if (!admin.partnerId) return NextResponse.json({ error: 'No Partner' }, { status: 403 });
      filter.partnerId = admin.partnerId;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: filter,
      include: {
        user: { select: { firstName: true, username: true, nickname: true } }
      }
    });

    // 🛡️ Safe Serialization for BigInt
    return NextResponse.json(JSON.parse(JSON.stringify(subscriptions, (k, v) => 
      typeof v === 'bigint' ? v.toString() : v
    )));

  } catch (error: any) {
    console.error("🔥 Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}