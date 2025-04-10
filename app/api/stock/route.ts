import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { books } from '@/src/utils/bookinfo'; // Removed calculateStock import

// Type definitions
interface Book {
  id: string;
  title: string;
  stockLimit: number;
}

interface BooksCollection {
  fxckedUpBags: Book;
  humanRelations: Book;
}

// Helper function with enhanced logging
async function getBookStockData(bookId: keyof BooksCollection) {
  const book = books[bookId];
  if (!book) {
    throw new Error(`Invalid bookId: ${bookId}`);
  }

  const [assigned, redeemed] = await Promise.all([
    prisma.generatedCode.count({ where: { bookId: book.id } }),
    prisma.generatedCode.findMany({ 
      where: { bookId: book.id },
      select: { id: true, code: true, isUsed: true } // Only select needed fields
    })
  ]);
  
  const used = redeemed.filter(code => code.isUsed).length;
  
  // Debug log for redeemed codes
  console.log(`Redeemed codes for ${book.title}:`, {
    total: redeemed.length,
    used,
    sampleCodes: redeemed.slice(0, 3).map(c => c.code) // Show first 3 codes as sample
  });

  return {
    id: book.id,
    title: book.title,
    stockLimit: book.stockLimit,
    assigned,
    used,
    remaining: book.stockLimit - used
  };
}

// GET handler
export async function GET(req: NextRequest) {
  try {
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    const [fxckedUpData, humanData] = await Promise.all([
      getBookStockData('fxckedUpBags'),
      getBookStockData('humanRelations')
    ]);

    // Consolidated debug log
    console.log('Stock Summary:', {
      timestamp: new Date().toISOString(),
      fxckedUpBags: {
        used: fxckedUpData.used,
        limit: fxckedUpData.stockLimit,
        remaining: fxckedUpData.remaining
      },
      humanRelations: {
        used: humanData.used,
        limit: humanData.stockLimit,
        remaining: humanData.remaining
      }
    });

    const stockData = {
      fxckedUpBagsLimit: fxckedUpData.stockLimit,
      fxckedUpBagsUsed: fxckedUpData.used,
      fxckedUpBags: fxckedUpData.assigned,
      humanRelationsLimit: humanData.stockLimit,
      humanRelationsUsed: humanData.used,
      humanRelations: humanData.assigned
    };

    return NextResponse.json(stockData, { headers });
  } catch (error) {
    console.error('Stock API Error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}