import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ServiceType } from '@prisma/client';

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    console.log('🚀 Services API called');
    
    const url = new URL(req.url);
    const typeParam = url.searchParams.get('type');
    const partnerType = url.searchParams.get('partnerType');
    const partnerId = url.searchParams.get('partnerId');

    console.log('📊 Query params:', { typeParam, partnerType, partnerId });

    // Validate required type parameter
    if (!typeParam || !Object.values(ServiceType).includes(typeParam as ServiceType)) {
      console.log('❌ Invalid type parameter:', typeParam);
      return new NextResponse('Invalid or missing "type" parameter', { status: 400 });
    }

    const type = typeParam as ServiceType;

    console.log('🔍 Querying database...');

    // Build where clause
    const whereClause = {
      type,
      active: true,
      ...(partnerType && { partnerType }),
      ...(partnerId && { partnerId }),
    };

    console.log('🔍 Where clause:', whereClause);

    const services = await prisma.service.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        duration: true,
        priceShells: true,
        description: true,
        partnerType: true,
        partnerId: true,
      },
      orderBy: {
        priceShells: 'asc',
      },
    });

    console.log('📦 Services found:', services.length);

    // Transform data - handle BigInt serialization
    const transformed = services.map(s => ({
      id: s.id,
      name: s.name,
      duration: s.duration,
      priceShells: s.priceShells.toString(), // Convert BigInt to string for JSON
      description: s.description,
      partnerType: s.partnerType,
      partnerId: s.partnerId,
    }));

    console.log('✅ Returning transformed data');
    return NextResponse.json(transformed);

  } catch (error: any) {
    console.error('🔥 API Error:', {
      name: error.name,
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });

    // Return different errors based on type
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Duplicate constraint violation' }, { status: 409 });
    }
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (error.name === 'PrismaClientValidationError') {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Failed to fetch services',
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    }, { status: 500 });
  }
}