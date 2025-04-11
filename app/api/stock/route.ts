import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { books } from '@/src/utils/bookinfo';

interface Book {
  id: string;
  title: string;
  stockLimit: number;
}

interface BooksCollection {
  fxckedUpBags: Book;
  humanRelations: Book;
}

interface PurchaseAggregateResult {
  _sum: {
    fxckedUpBagsQty: number | null;
    humanRelationsQty: number | null;
  };
}

async function getBookStockData(bookId: keyof BooksCollection) {
  const book = books[bookId];
  if (!book) {
    throw new Error(`Invalid bookId: ${bookId}`);
  }

  // Type-safe aggregation query
  const purchases = await prisma.purchase.aggregate({
    where: {
      OR: [
        { fxckedUpBagsQty: { gt: 0 } },
        { humanRelationsQty: { gt: 0 } }
      ]
    },
    _sum: {
      fxckedUpBagsQty: true,
      humanRelationsQty: true
    }
  }) as PurchaseAggregateResult;

  // Get code counts
  const [totalCodes, usedCodes] = await Promise.all([
    prisma.generatedCode.count({ where: { bookId: book.id } }),
    prisma.generatedCode.count({ where: { bookId: book.id, isUsed: true } })
  ]);

  // Type-safe quantity calculation
  const totalPurchased = bookId === 'fxckedUpBags' 
    ? purchases._sum.fxckedUpBagsQty ?? 0 
    : purchases._sum.humanRelationsQty ?? 0;

  const actualUsed = Math.max(totalPurchased, usedCodes);

  console.log(`Stock data for ${book.title}:`, {
    totalCodes,
    usedCodes,
    totalPurchased,
    actualUsed,
    remaining: book.stockLimit - actualUsed
  });

  return {
    id: book.id,
    title: book.title,
    stockLimit: book.stockLimit,
    assigned: totalCodes,
    used: actualUsed,
    remaining: book.stockLimit - actualUsed
  };
}

export async function GET(req: NextRequest) {
  try {
    const [fxckedUpData, humanData] = await Promise.all([
      getBookStockData('fxckedUpBags'),
      getBookStockData('humanRelations')
    ]);

    const stockData = {
      fxckedUpBagsLimit: fxckedUpData.stockLimit,
      fxckedUpBagsUsed: fxckedUpData.used,
      fxckedUpBags: fxckedUpData.assigned,
      humanRelationsLimit: humanData.stockLimit,
      humanRelationsUsed: humanData.used,
      humanRelations: humanData.assigned,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(stockData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
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