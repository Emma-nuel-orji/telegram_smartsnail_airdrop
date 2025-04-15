import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { books } from '@/src/utils/bookinfo';

export async function GET(req: NextRequest) {
  try {
    const getStockData = async (title: string) => {
      const book = await prisma.book.findFirst({
        where: { title },
        select: { usedStock: true }
      });
      
      if (!book) throw new Error(`Book "${title}" not found`);
      
      const [totalCodes, usedCodes] = await Promise.all([
        prisma.generatedCode.count({
          where: { book: { title } }
        }),
        prisma.generatedCode.count({
          where: { book: { title }, isUsed: true }
        })
      ]);

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

    return NextResponse.json({
      fxckedUpBagsLimit: books.fxckedUpBags.stockLimit,
      fxckedUpBagsUsed: fxckedUp.used,
      fxckedUpBagsAvailable: fxckedUp.availableCodes,
      humanRelationsLimit: books.humanRelations.stockLimit,
      humanRelationsUsed: human.used,
      humanRelationsAvailable: human.availableCodes,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stock API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to load stock data',
        details: error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}