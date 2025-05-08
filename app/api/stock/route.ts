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

// Static cache with shorter TTL and request tracking
const cache = {
  data: null as any,
  timestamp: 0,
  ttl: 10 * 1000, // 10 seconds cache for normal requests
  purchaseTtl: 1 * 1000, // 1 second cache after purchases
  trackingData: {
    lastPurchaseTime: 0,
    purchasePending: false,
    retryCount: 0,
  }
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
  
  // Extract purchase info
  const lastPurchaseParam = req.nextUrl.searchParams.get('lastPurchase');
  const lastPurchaseTime = lastPurchaseParam ? parseInt(lastPurchaseParam) : 0;
  const isPurchaseRelated = lastPurchaseTime > 0;
  
  // Update tracking data if this is a purchase-related request
  if (isPurchaseRelated && lastPurchaseTime > cache.trackingData.lastPurchaseTime) {
    cache.trackingData.lastPurchaseTime = lastPurchaseTime;
    cache.trackingData.purchasePending = true;
    cache.trackingData.retryCount = 0;
  }
  
  try {
    const now = Date.now();
    
    // For purchase-related requests, apply special rules
    if (isPurchaseRelated) {
      // Force refresh if this is a purchase-related request and we're still in pending state
      const timeSincePurchase = now - lastPurchaseTime;
      const hasRecentPurchase = timeSincePurchase < 30000; // Within 30 seconds
      
      // If we're in a purchase-pending state, adjust retry behavior
      if (hasRecentPurchase && cache.trackingData.purchasePending) {
        // Increment retry count
        cache.trackingData.retryCount++;
        
        // After several retries with the same result, consider the purchase complete
        if (cache.trackingData.retryCount >= 3 && cache.data) {
          // Mark purchase as no longer pending after several consistent reads
          cache.trackingData.purchasePending = false;
          console.log(`[${now}] Purchase considered complete after ${cache.trackingData.retryCount} consistent reads`);
        }
        
        // For the first few retries, always get fresh data
        if (cache.trackingData.retryCount <= 2) {
          console.log(`[${now}] Forcing refresh for purchase-related request (retry #${cache.trackingData.retryCount})`);
          // Force a fresh read from the database
          // Don't use cache here
        } else {
          // After multiple retries, we can use cache with a very short TTL
          if (useCache && cache.data && (now - cache.timestamp < cache.purchaseTtl)) {
            console.log(`[${now}] Using short-lived cache for purchase retry #${cache.trackingData.retryCount}`);
            if (debug) {
              return NextResponse.json({
                ...cache.data,
                debug: {
                  source: 'short-lived-cache',
                  purchaseTime: new Date(lastPurchaseTime).toISOString(),
                  retryCount: cache.trackingData.retryCount,
                  timeSincePurchase: `${timeSincePurchase}ms`,
                }
              }, { headers });
            }
            return NextResponse.json(cache.data, { headers });
          }
        }
      } else {
        // If not in pending state but still purchase-related, use normal cache rules
        if (useCache && cache.data && (now - cache.timestamp < cache.ttl)) {
          console.log(`[${now}] Using standard cache for post-purchase request`);
          if (debug) {
            return NextResponse.json({
              ...cache.data,
              debug: {
                source: 'standard-cache',
                purchaseTime: new Date(lastPurchaseTime).toISOString(),
                timeSincePurchase: `${timeSincePurchase}ms`,
              }
            }, { headers });
          }
          return NextResponse.json(cache.data, { headers });
        }
      }
    } else {
      // Normal non-purchase request - use standard caching rules
      if (useCache && cache.data && (now - cache.timestamp < cache.ttl)) {
        console.log(`[${now}] Using standard cache for normal request`);
        if (debug) {
          return NextResponse.json({
            ...cache.data,
            debug: {
              source: 'standard-cache',
              cachedAt: new Date(cache.timestamp).toISOString(),
              age: (now - cache.timestamp) / 1000,
            }
          }, { headers });
        }
        return NextResponse.json(cache.data, { headers });
      }
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

      // Use the usedStock field from the book document
      return {
        used: book.usedStock,
        totalCodes: totalCodes,
        usedCodesCount: usedCodesCount,
        stockLimit: book.stockLimit,
        available: book.stockLimit - book.usedStock
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

    // If this is a purchase-related request and we have a previous reading,
    // check if we see the expected change in stock
    if (isPurchaseRelated && cache.data && cache.trackingData.purchasePending) {
      const previousUsed = cache.data.fxckedUpBagsUsed;
      
      // If stock hasn't changed, but we're in a post-purchase request,
      // we might need to wait for database updates to propagate
      if (previousUsed === fxckedUp.used && cache.trackingData.retryCount < 3) {
        console.log(`[${Date.now()}] No stock change detected on retry #${cache.trackingData.retryCount}. Previous: ${previousUsed}, Current: ${fxckedUp.used}`);
        
        // Add a slight delay before responding to allow database to catch up
        if (cache.trackingData.retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Try one more immediate read
          const refreshedBook = await prisma.book.findFirst({
            where: { title: books.fxckedUpBags.title },
            select: { usedStock: true }
          });
          
          if (refreshedBook && refreshedBook.usedStock !== previousUsed) {
            console.log(`[${Date.now()}] Retry read successful! Updated stock: ${refreshedBook.usedStock}`);
            fxckedUp.used = refreshedBook.usedStock;
            fxckedUp.available = fxckedUp.stockLimit - refreshedBook.usedStock;
          }
        }
      } else if (previousUsed !== fxckedUp.used) {
        // Stock has changed, mark purchase as processed
        console.log(`[${Date.now()}] Stock change detected! Previous: ${previousUsed}, Current: ${fxckedUp.used}`);
        cache.trackingData.purchasePending = false;
      }
    }

    const responseData = {
      fxckedUpBagsLimit: books.fxckedUpBags.stockLimit,
      fxckedUpBagsUsed: fxckedUp.used,
      fxckedUpBagsAvailable: fxckedUp.available,
      humanRelationsLimit: books.humanRelations.stockLimit,
      humanRelationsUsed: human.used,
      humanRelationsAvailable: human.available,
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
        databaseResults: {
          fxckedUpBags: {
            usedStock: fxckedUp.used,
            usedCodesCount: fxckedUp.usedCodesCount,
            totalCodes: fxckedUp.totalCodes
          },
          humanRelations: {
            usedStock: human.used,
            usedCodesCount: human.usedCodesCount,
            totalCodes: human.totalCodes
          }
        },
        purchaseTracking: isPurchaseRelated ? {
          lastPurchaseTime: new Date(cache.trackingData.lastPurchaseTime).toISOString(),
          purchasePending: cache.trackingData.purchasePending,
          retryCount: cache.trackingData.retryCount,
          timeSincePurchase: lastPurchaseTime > 0 ? `${now - lastPurchaseTime}ms` : 'N/A'
        } : undefined,
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