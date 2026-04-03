import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ServiceType } from '@prisma/client';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    
    // 1. Extract all Query Parameters
    const typeParam = url.searchParams.get('type') || 'SUBSCRIPTION';
    const partnerId = url.searchParams.get('partnerId');
    const partnerType = url.searchParams.get('partnerType'); // Back in!
    const ageGroup = url.searchParams.get('ageGroup');
    const intensity = url.searchParams.get('intensity');

    // 2. Validate ServiceType (Strict check)
    if (!Object.values(ServiceType).includes(typeParam as ServiceType)) {
      console.error('❌ Invalid type parameter:', typeParam);
      return new NextResponse('Invalid or missing "type" parameter', { status: 400 });
    }

    // 3. Build the Detailed Where Clause
    const whereClause: any = {
      type: typeParam as ServiceType,
      active: true,
      ...(partnerId && { partnerId }),
      ...(partnerType && { partnerType }), // Filters by "GYM" or "COMBAT"
      ...(ageGroup && { ageGroup }),
      ...(intensity && { intensity }),
    };

    console.log('🔍 Executing Search with Clause:', whereClause);

    // 4. Fetch from MongoDB
    const services = await prisma.service.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        duration: true,
        priceShells: true,
        priceStars: true,
        description: true,
        partnerType: true,
        partnerId: true,
        ageGroup: true,
        intensity: true,
      },
      orderBy: {
        priceShells: 'asc',
      },
    });

    // 5. Safe BigInt Serialization
    const transformed = services.map(s => ({
      ...s,
      priceShells: s.priceShells.toString(),
      priceStars: s.priceStars ? Number(s.priceStars) : 0, // Keeps Stars as a number for UI logic
    }));

    return NextResponse.json(transformed);

  } catch (error: any) {
    // 6. RESTORED: Professional Error Logging
    console.error('🔥 API Error Details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    // 7. RESTORED: Specific Prisma Error Responses
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate constraint violation' }, { status: 409 });
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (error.name === 'PrismaClientValidationError') {
      return NextResponse.json({ error: 'Invalid query parameters (Prisma)' }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to fetch services',
      details: process.env.NODE_ENV === 'development' ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}