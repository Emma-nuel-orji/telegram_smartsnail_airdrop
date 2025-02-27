import { NextRequest, NextResponse } from 'next/server';  // Corrected import from 'next/server'
import { prisma } from '@/prisma/client';
import { books, calculateStock } from '@/src/utils/bookinfo'; // Adjust path as needed

// Define a type for the book object
interface Book {
  id: string;
  title: string;
  stockLimit: number;
}

// GET handler
export async function GET(req: NextRequest) {
  try {
    const bookStocks = await Promise.all(
      Object.values(books).map(async (book: Book) => {
        const totalAssigned = await prisma.generatedCode.count({
          where: { bookId: book.id },
        });

        const redeemedCodes = await prisma.generatedCode.findMany({
          where: { bookId: book.id },
        });

        const stockInfo = calculateStock(book, redeemedCodes);
        console.log(`Stock Calculation for ${book.title}:`, stockInfo); // Debugging

        const usedStock = Number(stockInfo.split('/')[0]); // Ensure correct parsing

        return {
          id: book.id,
          title: book.title,
          stockLimit: book.stockLimit || 10000, // Default limit
          assigned: totalAssigned,
          used: usedStock,
          remaining: book.stockLimit - usedStock,
        };
      })
    );

    // Reduce to aggregate fxckedUpBags & humanRelations
    const stockData = bookStocks.reduce((acc, book) => {
      if (book.id === 'fxckedUpBags') {
        acc.fxckedUpBagsLimit = book.stockLimit;
        acc.fxckedUpBagsUsed = book.used;
        acc.fxckedUpBags = book.assigned;
      } else if (book.id === 'humanRelations') {
        acc.humanRelationsLimit = book.stockLimit;
        acc.humanRelationsUsed = book.used;
        acc.humanRelations = book.assigned;
      }
      return acc;
    }, {
      fxckedUpBagsLimit: 10000,
      humanRelationsLimit: 10000,
      fxckedUpBagsUsed: 0,
      humanRelationsUsed: 0,
      fxckedUpBags: 0,
      humanRelations: 0,
    });

    return NextResponse.json(stockData);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

