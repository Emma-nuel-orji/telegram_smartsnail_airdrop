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
        // Count of all generated codes for the book
        const totalAssigned = await prisma.generatedCode.count({
          where: { bookId: book.id },
        });

        // Fetch redeemed codes
        const redeemedCodes = await prisma.generatedCode.findMany({
          where: { bookId: book.id },
        });

        // Calculate remaining stock using the helper function
        const stockInfo = calculateStock(book, redeemedCodes);

        // Detailed stock information
        return {
          id: book.id,
          title: book.title,
          fxckedUpBagsLimit: book.id === 'fxckedUpBags' ? book.stockLimit : 10000,
          humanRelationsLimit: book.id === 'humanRelations' ? book.stockLimit : 10000,
          fxckedUpBagsUsed: book.id === 'fxckedUpBags' ? Number(stockInfo.split('/')[0]) : 0,
          humanRelationsUsed: book.id === 'humanRelations' ? Number(stockInfo.split('/')[0]) : 0,
          fxckedUpBags: book.id === 'fxckedUpBags' ? totalAssigned : 0,
          humanRelations: book.id === 'humanRelations' ? totalAssigned : 0,
          assigned: totalAssigned,
          used: Number(stockInfo.split('/')[0]),
          remaining: book.stockLimit - Number(stockInfo.split('/')[0]),
        };
      })
    );

    // Combine and transform the data to match the expected format
    const stockData = bookStocks.reduce((acc, book) => {
      acc.fxckedUpBagsLimit = Math.max(acc.fxckedUpBagsLimit, book.fxckedUpBagsLimit);
      acc.humanRelationsLimit = Math.max(acc.humanRelationsLimit, book.humanRelationsLimit);
      acc.fxckedUpBagsUsed += book.fxckedUpBagsUsed;
      acc.humanRelationsUsed += book.humanRelationsUsed;
      acc.fxckedUpBags += book.fxckedUpBags;
      acc.humanRelations += book.humanRelations;
      return acc;
    }, {
      fxckedUpBagsLimit: 0,
      humanRelationsLimit: 0,
      fxckedUpBagsUsed: 0,
      humanRelationsUsed: 0,
      fxckedUpBags: 0,
      humanRelations: 0,
    });

    // Respond with aggregated stock data
    return NextResponse.json(stockData);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
