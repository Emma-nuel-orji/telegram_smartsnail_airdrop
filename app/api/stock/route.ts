import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { books } from '@/src/utils/bookinfo';

export async function GET(req: NextRequest) {
  // Add cache control headers to prevent caching
  const headers = new Headers();
  headers.set('Cache-Control', 'no-store, max-age=0');
  headers.set('Pragma', 'no-cache');
  headers.set('X-Request-Time', new Date().toISOString());

  // Get debug parameter from query string
  const debug = req.nextUrl.searchParams.get('debug') === 'true';
  
  try {
    console.log('Stock API called at:', new Date().toISOString());
    
    // Force Prisma to create a fresh connection
    await prisma.$disconnect();
    
    const getStockData = async (title: string) => {
      console.log(`Fetching stock data for: "${title}"`);
      
      const book = await prisma.book.findFirst({
        where: { title },
        select: { usedStock: true }
      });
      
      if (!book) {
        console.error(`Book "${title}" not found`);
        throw new Error(`Book "${title}" not found`);
      }
      
      const [totalCodes, usedCodes] = await Promise.all([
        prisma.generatedCode.count({
          where: { book: { title } }
        }),
        prisma.generatedCode.count({
          where: { book: { title }, isUsed: true }
        })
      ]);

      console.log(`Results for "${title}":`, {
        usedStock: book.usedStock,
        totalCodes,
        usedCodes,
        availableCodes: totalCodes - usedCodes
      });

      return {
        used: book.usedStock,
        assigned: totalCodes,
        availableCodes: totalCodes - usedCodes
      };
    };

    const [fxckedUp, human] = await Promise.all([
      getStockData(books.fxckedUpBags.title),
      getStockData(books.humanRelations.title)
    ]);

    const responseData = {
      fxckedUpBagsLimit: books.fxckedUpBags.stockLimit,
      fxckedUpBagsUsed: fxckedUp.used,
      fxckedUpBagsAvailable: fxckedUp.availableCodes,
      humanRelationsLimit: books.humanRelations.stockLimit,
      humanRelationsUsed: human.used,
      humanRelationsAvailable: human.availableCodes,
      timestamp: new Date().toISOString()
    };

    // Include debug information if requested
    if (debug) {
      const debugInfo = {
        environment: process.env.NODE_ENV || 'unknown',
        databaseUrl: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.split('@')[1] || 'masked' : 'not set', // Only show host, not credentials
        isPrismaConnected: true, // If we got here, we're connected
        books: Object.keys(books)
      };
      
      return NextResponse.json(
        { ...responseData, debug: debugInfo },
        { headers }
      );
    }

    return NextResponse.json(responseData, { headers });

  } catch (error) {
    console.error('Stock API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load stock data',
        details: error instanceof Error ? error.message : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500, headers }
    );
  } finally {
    // Make sure to close the Prisma connection
    await prisma.$disconnect();
  }
}