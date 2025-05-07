import { NextRequest, NextResponse } from 'next/server';
import { books } from '@/src/utils/bookinfo';

// Import Prisma with PrismaClient options to optimize performance
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  // Set lower connection timeout to fail fast if DB is unavailable
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Static cache to reduce database calls (TTL: 5 minutes)
const cache = {
  data: null as any,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
};

export async function GET(req: NextRequest) {
  const start = Date.now();
  console.log(`[${start}] Stock API request started`);
  
  // Add cache control headers to prevent network caching
  const headers = new Headers({
    'Cache-Control': 'no-store, max-age=0',
    'Pragma': 'no-cache',
    'X-Request-Time': new Date().toISOString(),
  });
  
  // Parse query parameters
  const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true';
  const debug = req.nextUrl.searchParams.get('debug') === 'true';
  const useCache = !forceRefresh && req.nextUrl.searchParams.get('nocache') !== 'true';
  
  try {
    // Check if we can use cached data
    const now = Date.now();
    if (useCache && cache.data && (now - cache.timestamp < cache.ttl)) {
      console.log(`[${now}] Using cached data from ${new Date(cache.timestamp).toISOString()}`);
      
      // Add debug info if requested
      if (debug) {
        return NextResponse.json({
          ...cache.data,
          debug: {
            source: 'cache',
            cachedAt: new Date(cache.timestamp).toISOString(),
            age: (now - cache.timestamp) / 1000,
            ttl: cache.ttl / 1000,
          }
        }, { headers });
      }
      
      return NextResponse.json(cache.data, { headers });
    }
    
    console.log(`[${Date.now()}] Fetching fresh data from database`);
    
    // Set a timeout to catch slow database operations
    const dbTimeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Database operation timed out after 5s')), 5000);
    });
    
    const getStockData = async (title: string) => {
      console.log(`[${Date.now()}] Fetching stock for: "${title}"`);
      
      // Find the book first
      const book = await prisma.book.findFirst({
        where: { title },
        select: { id: true, usedStock: true }
      });
      
      if (!book) {
        throw new Error(`Book "${title}" not found`);
      }
      
      // Use the book ID for better query performance
      const [totalCodes, usedCodes] = await Promise.all([
        prisma.generatedCode.count({
          where: { bookId: book.id }
        }),
        prisma.generatedCode.count({
          where: { bookId: book.id, isUsed: true }
        })
      ]);

      return {
        used: book.usedStock,
        assigned: totalCodes,
        availableCodes: totalCodes - usedCodes
      };
    };

    // Race the database operations against the timeout
    const stockData = await Promise.race([
      Promise.all([
        getStockData(books.fxckedUpBags.title),
        getStockData(books.humanRelations.title)
      ]),
      dbTimeout
    ]) as [any, any];
    
    const [fxckedUp, human] = stockData;

    const responseData = {
      fxckedUpBagsLimit: books.fxckedUpBags.stockLimit,
      fxckedUpBagsUsed: fxckedUp.used,
      fxckedUpBagsAvailable: fxckedUp.availableCodes,
      humanRelationsLimit: books.humanRelations.stockLimit,
      humanRelationsUsed: human.used,
      humanRelationsAvailable: human.availableCodes,
      timestamp: new Date().toISOString()
    };

    // Update the cache
    cache.data = responseData;
    cache.timestamp = Date.now();
    
    // Include debug information if requested
    if (debug) {
      const end = Date.now();
      const debugInfo = {
        executionTime: `${end - start}ms`,
        environment: process.env.NODE_ENV || 'unknown',
        databaseHost: process.env.DATABASE_URL ? 
          new URL(process.env.DATABASE_URL).hostname : 'unknown',
        source: 'database',
        cachedAt: new Date(cache.timestamp).toISOString(),
      };
      
      return NextResponse.json(
        { ...responseData, debug: debugInfo },
        { headers }
      );
    }

    return NextResponse.json(responseData, { headers });

  } catch (error) {
    console.error(`[${Date.now()}] Stock API Error:`, error);
    
    // Check if there's cached data we can return as fallback
    if (cache.data) {
      console.log(`[${Date.now()}] Returning stale cache data due to error`);
      const errorResponse = {
        ...cache.data,
        warning: 'Using stale data due to error',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      
      return NextResponse.json(errorResponse, { 
        status: 200, 
        headers: { ...headers, 'X-Using-Stale-Data': 'true' }
      });
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to load stock data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500, headers }
    );
  }
}