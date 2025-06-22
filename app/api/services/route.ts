import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PrismaClient, ServiceType } from '@prisma/client';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const typeParam = url.searchParams.get('type');
    const partnerType = url.searchParams.get('partnerType'); // NEW
    const partnerId = url.searchParams.get('partnerId');

    if (!typeParam || !Object.values(ServiceType).includes(typeParam as ServiceType)) {
      return new NextResponse('Invalid or missing "type" parameter', { status: 400 });
    }

    const type = typeParam as ServiceType;

    const services = await prisma.service.findMany({
      where: {
        type,
        ...(partnerType ? { partnerType } : {}),
        ...(partnerId ? { partnerId } : {}),
        active: true, // Only return active services
      },
      select: {
        id: true,
        name: true,
        duration: true,
        priceShells: true,
        description: true,

      },
      orderBy: {
        priceShells: 'asc',
      },
    });

    const transformed = services.map(s => ({
      id: s.id,
      name: s.name,
      duration: s.duration,
      priceShells: s.priceShells, 
      description: s.description,
    }));

    return NextResponse.json(transformed);
  } catch (error: any) {
  console.error('🔥 Prisma error fetching services:', {
    message: error.message,
    stack: error.stack,
    cause: error.cause,
    code: error.code,
  });

  return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
}

}
