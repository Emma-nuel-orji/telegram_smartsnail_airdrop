// app/api/fights/upcoming/route.ts
import { NextResponse } from 'next/server';
import{prisma} from '@/lib/prisma';

export async function GET() {
  try {
    // Get all upcoming fights (scheduled and in the future)
    const fights = await prisma.fight.findMany({
      where: {
        status: 'SCHEDULED',
        fightDate: {
          gte: new Date()
        }
      },
      include: {
        fighter1: true,
        fighter2: true
      },
      orderBy: {
        fightDate: 'asc'
      }
    });
    
    return NextResponse.json(fights);
  } catch (error) {
    console.error('Error fetching upcoming fights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming fights' },
      { status: 500 }
    );
  }
}