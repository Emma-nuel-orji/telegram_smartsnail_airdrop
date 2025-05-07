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

// Static cache with request timestamp tracking
const cache = {
  data: null as any,
  timestamp: 0,
  ttl: 30 * 1000, // Reduced to 30 seconds to ensure fresher data
  lastRequestTime: 0, // Track when the last request was made
};

export async function GET(req: NextRequest) {
  const start = Date.now();
  console.log(`[${start}] Stock API request started`);
  
  // Always update the last request time
  cache.lastRequestTime = start;
  
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
    // Add a time buffer to ensure we don't use cached data immediately after a purchase
    const now = Date.now();
    const timeSinceLastPurchase = req.nextUrl.searchParams.get('lastPurchase') ? 
      now - parseInt(req.nextUrl.searchParams.get('lastPurchase') || '0') : 
      Number.MAX_SAFE_INTEGER;
    
    // Don't use cache if a purchase was made recently (within 5 seconds)
    const shouldUseCache = useCache && 
                          cache.data && 
                          (now - cache.timestamp < cache.ttl) && 
                          timeSinceLastPurchase > 5000;
    
    if (shouldUseCache) {
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
            timeSinceLastPurchase: timeSinceLastPurchase / 1000,
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
      
      // Find the book and use its usedStock field directly
      const book = await prisma.book.findFirst({
        where: { title },
        select: { id: true, usedStock: true, stockLimit: true }
      });
      
      if (!book) {
        throw new Error(`Book "${title}" not found`);
      }
      
      // For debugging, still count the codes to see the discrepancy
      const [totalCodes, usedCodesCount] = await Promise.all([
        prisma.generatedCode.count({
          where: { bookId: book.id }
        }),
        prisma.generatedCode.count({
          where: { 
            bookId: book.id,
            OR: [
              { isUsed: true },
              { purchaseId: { not: null } },
              { usedAt: { not: null } }
            ]
          }
        })
      ]);

      console.log(`[${Date.now()}] Book "${title}" - DB usedStock: ${book.usedStock}, Counted usedCodes: ${usedCodesCount}, Total codes: ${totalCodes}`);

      // Use the usedStock field from the book document instead of counting codes
      return {
        used: book.usedStock,
        assigned: totalCodes,
        stockLimit: book.stockLimit,
        availableCodes: totalCodes - book.usedStock
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
      fxckedUpBagsAvailable: fxckedUp.stockLimit - fxckedUp.used,  // Use stockLimit from book
      humanRelationsLimit: books.humanRelations.stockLimit,
      humanRelationsUsed: human.used,
      humanRelationsAvailable: human.stockLimit - human.used,  // Use stockLimit from book
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
        timeSinceLastPurchase: timeSinceLastPurchase / 1000,
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