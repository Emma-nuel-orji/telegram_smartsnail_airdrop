import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { ObjectId } from "mongodb";
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from "@/lib/auth";
import { PrismaClient, Book, Prisma } from '@prisma/client';
import {
  verifyTonPayment,
  initiateFlutterwavePayment,
  verifyPayment,
} from "@/src/utils/paymentUtils";
import { sendPurchaseEmail } from '@/src/utils/emailUtils';
import { validateTelegramWebAppData } from '@/src/utils/telegram';
import { processPayment, updateDatabaseTransaction } from './logic';
// Type definitions
interface StockCalculationResult {
  totalAmount: number;
  tappingRate: number;
  points: number;
  codes: string[];
  updatedStocks: Array<{
    title: string;
    used: number;
    available: number;
  }>;
}

interface BookPurchaseInfo {
  title: string;
  qty: number;
  id: string; 
  bookId: string; 
  book: Omit<Book, 'coinsReward'> & { coinsReward: number };
}

interface Order {
  id: string;
  orderId: string;
  paymentMethod: string;
  totalAmount: number;
  status: string;
  email?: string;
  telegramId?: string;
  fxckedUpBagsQty: number;
  humanRelationsQty: number;
  referrerId?: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PurchaseData {
  _id?: ObjectId;
  userId: ObjectId;
  bookId: ObjectId;
  paymentType: string;
  amountPaid: number;
  booksBought: number;
  orderReference: string;
  fxckedUpBagsQty: number;
  humanRelationsQty: number;
  coinsReward: number;
  createdAt: Date;
}



interface PendingTransaction {
  id: string;
  orderId: string;
  status: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface BookMap {
  [key: string]: Book;
}

interface OrderWithTransactions extends Order {
  pendingTransactions?: PendingTransaction[];
}

// Environment variables validation
const requiredEnv = ["SECRET_KEY", "NEXT_PUBLIC_REDIRECT_URL"];
const redirectUrl = process.env.NEXT_PUBLIC_REDIRECT_URL || 'https://default.redirect.url';
const JSONbig = require('json-bigint');



requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    throw new Error(`Environment variable ${env} is missing`);
  }
});

// Zod schema for request validation
const requestSchema = z.object({
  email: z.string().email(),
  paymentMethod: z.enum(["TON", "CARD", "STARS"]),
  fxckedUpBagsQty: z.number().int().nonnegative().default(0),
  humanRelationsQty: z.number().int().nonnegative().default(0),
  referrerId: z.string().optional().default(""),
  paymentReference: z.string().optional().default(""),
  orderId: z.string().nullable().optional(),
 
});


async function getCurrentStock(
  tx: Prisma.TransactionClient,
  booksToPurchase: BookPurchaseInfo[]
) {
  const bookTitles = [...new Set(booksToPurchase.map(b => b.title))];
  
  const stockData = await tx.book.findMany({
    where: { title: { in: bookTitles } },
    select: { title: true, usedStock: true, stockLimit: true }
  });

  const codeAvailability = await Promise.all(
    bookTitles.map(title => 
      tx.generatedCode.count({
        where: { book: { title }, isUsed: false }
      })
    )
  );

  return stockData.map((book, index) => ({
    title: book.title,
    used: book.usedStock,
    limit: book.stockLimit,
    availableCodes: codeAvailability[index],
    timestamp: new Date().toISOString()
  }));
}


export async function GET(req: NextRequest) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const fxckedUpBagsQty = Number(searchParams.get('fxckedUpBagsQty')) || 0;
    const humanRelationsQty = Number(searchParams.get('humanRelationsQty')) || 0;

    const purchaseData = await preparePurchaseData(
      fxckedUpBagsQty,
      humanRelationsQty
    );

    return NextResponse.json({ success: true, data: purchaseData });
  } catch (error) {
    console.error('Pre-purchase check error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



async function preparePurchaseData(fxckedUpBagsQty: number, humanRelationsQty: number) {
  console.log("Preparing purchase data with:", { fxckedUpBagsQty, humanRelationsQty });

  const booksToFind = [
    ...(fxckedUpBagsQty > 0 ? ["FxckedUpBags (Undo Yourself)"] : []),
    ...(humanRelationsQty > 0 ? ["Human Relations"] : [])
  ];

  if (booksToFind.length === 0) {
    throw new Error("No books selected for purchase");
  }

  console.log("Books to find:", booksToFind);

  const books = await prisma.book.findMany({
    where: {
      title: { in: booksToFind }
    }
  });

  console.log("Books fetched from database:", books);

  if (!books || books.length === 0) {
    throw new Error("No books found in database");
  }

  const booksToPurchase = books
    .map(book => {
      if (!book) return null;

      const qty =
        book.title === "FxckedUpBags (Undo Yourself)"
          ? fxckedUpBagsQty
          : book.title === "Human Relations"
            ? humanRelationsQty
            : 0;

      if (qty <= 0) {
        console.log(`Skipping book ${book.title} with invalid quantity: ${qty}`);
        return null;
      }

      const convertedBook = {
        ...book,
        coinsReward: Number(book.coinsReward),
        priceCard: Number(book.priceCard),
        priceTon: Number(book.priceTon)
      };

      return {
        qty,
        id: book.id,
        title: book.title,
        bookId: book.id,
        book: {
          ...book,
          coinsReward: Number(book.coinsReward) // Convert bigint to number
        }
      };
    })
    .filter((info): info is BookPurchaseInfo => info !== null);

  if (booksToPurchase.length === 0) {
    throw new Error("No valid books found for purchase");
  }

  console.log("Final booksToPurchase:", booksToPurchase);

  // Create bookMap with converted coinsReward
  const bookMap = Object.fromEntries(
    books.map(book => [
      book.title,
      {
        ...book,
        coinsReward: Number(book.coinsReward),
        priceCard: Number(book.priceCard),
        priceTon: Number(book.priceTon)
      }
    ])
  );

  return { booksToPurchase, bookMap };
}

export async function POST(req: NextRequest): Promise<Response> {
  console.log("1. Starting secure POST request");

  try {
    // ===============================
    // 1. AUTHENTICATION (SECURITY LAYER)
    // ===============================
    const auth = await authenticateTelegramUser(req);

    if (!auth?.isAuthenticated || !auth.telegramId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const verifiedTelegramId = auth.telegramId.toString();
    console.log("2. Verified Telegram ID:", verifiedTelegramId);

    // ===============================
    // 2. SAFE BODY EXTRACTION
    // ===============================
    const body = await req.json();
    console.log("3. Request body:", body);

    const {
      email,
      paymentMethod,
      fxckedUpBagsQty = 0,
      humanRelationsQty = 0,
      referrerId,
      paymentReference,
      bookIds = [],
    } = body;

    // ===============================
    // 3. VALIDATION (CLEAN & STRICT)
    // ===============================
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json(
        { error: "Valid email required" },
        { status: 400 }
      );
    }

    if (!["TON", "CARD", "STARS"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    if (fxckedUpBagsQty <= 0 && humanRelationsQty <= 0) {
      return NextResponse.json(
        { error: "Select at least one book" },
        { status: 400 }
      );
    }

    // ===============================
    // 4. FETCH BOOKS FROM DB (TRUST NO CLIENT DATA)
    // ===============================
    const books = await prisma.book.findMany({
      where: {
        title: {
          in: [
            ...(fxckedUpBagsQty > 0
              ? ["FxckedUpBags (Undo Yourself)"]
              : []),
            ...(humanRelationsQty > 0
              ? ["Human Relations"]
              : []),
          ],
        },
      },
    });

    if (!books.length) {
      return NextResponse.json(
        { error: "Books not found" },
        { status: 404 }
      );
    }

    console.log("4. Books fetched:", books.length);

    // ===============================
    // 5. SERVER-SIDE CALCULATION
    // ===============================
    let totalAmount = 0;
    let tappingRate = 0;
    let coinsReward = 0;
    let totalBooks = 0;

    for (const book of books) {
      const qty =
        book.title.includes("FxckedUpBags")
          ? fxckedUpBagsQty
          : humanRelationsQty;

      totalAmount += qty * Number(book.priceTon || 0);
      tappingRate += qty * Number(book.tappingRate || 0);
      coinsReward += qty * Number(book.coinsReward || 0);
      totalBooks += qty;
    }

    const priceStars = totalBooks * 400;

    console.log("5. Calculated values:", {
      totalAmount,
      tappingRate,
      coinsReward,
      totalBooks,
    });

    // ===============================
    // 6. TRANSACTION (SAFE ZONE)
    // ===============================
    const result = await prisma.$transaction(async (tx) => {
      
      // Create pending transaction (SAFE VERSION)
      const order = await tx.order.create({
        data: {
          orderId: `ORD-${Date.now()}`,
          paymentMethod,
          totalAmount,
          status: "PENDING",
        },
      });

      const pending = await tx.pendingTransaction.create({
        data: {
          email,
          amount: totalAmount,
          bookCount: totalBooks,

          fxckedUpBagsQty,
          humanRelationsQty,

          telegramId: verifiedTelegramId,
          referrerId: referrerId || null,

          tappingRate,
          totalPoints: coinsReward,

          payloadData: JSON.stringify({
            orderId: order.id,
            telegramId: verifiedTelegramId,
          }),

          status: "PENDING",
          orderId: order.id,
        },
      });

      // ===============================
      // 7. CALL YOUR EXISTING LOGIC
      // ===============================
      const paymentResult = await processPayment(
        tx,
        paymentMethod,
        paymentReference || order.orderId,
        totalAmount,
        verifiedTelegramId,
        totalBooks,
        Array.isArray(bookIds) && bookIds.length > 0 ? bookIds[0] : "",
        fxckedUpBagsQty,
        humanRelationsQty
      );

      return {
        success: true,
        orderId: paymentResult.orderId,
        pendingId: pending.id,
        totalAmount,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Purchase error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}

type PrismaTransaction = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>;

async function validateStockAndCalculateTotals(
  tx: Prisma.TransactionClient,
  booksToPurchase: BookPurchaseInfo[],
  bookMap: { [k: string]: any },
  paymentMethod: string
          ): Promise<StockCalculationResult> {
            let totalAmount = 0;
            let tappingRate = 0;
            let points = 0;
            const codes: string[] = [];
            const updatedStocks: Array<{ title: string; used: number; available: number }> = [];
            const totalQty = booksToPurchase.reduce((sum, book) => sum + book.qty, 0);

            // 1. Check TOTAL available codes (neutral pool)
            const availableCodes = await tx.generatedCode.findMany({
              where: { 
                isUsed: false,
                isReserved: false
              },
              take: totalQty,
              orderBy: { createdAt: 'asc' } // FIFO
            });

            console.log("🔍 Available codes fetched:", availableCodes.length);
            console.log("📦 Total quantity requested:", totalQty);

            if (availableCodes.length < totalQty) {
              throw new Error("Insufficient stock for the requested quantity of books");
            }

            // 2. Reserve codes (neutral reservation)
            
            const codesToReserve = availableCodes.map(c => c.id);
            console.log("🔒 Reserving codes with IDs:", codesToReserve);
            await tx.generatedCode.updateMany({
              where: { id: { in: codesToReserve } },
              data: { isReserved: true }
            });


            // 3. Assign to books and calculate
            let codeIndex = 0;
            for (const { qty, book, title } of booksToPurchase) {
              if (!book) throw new Error(`Book details not found for ${title}`);
              
              // Assign next batch of codes
              const assignedCodes = availableCodes.slice(codeIndex, codeIndex + qty);
              codes.push(...assignedCodes.map(c => c.code));
              codeIndex += qty;

              // Calculate stock (using your existing book-based tracking)
              const newUsedStock = book.usedStock + qty;
              updatedStocks.push({
                title,
                used: newUsedStock,
                available: book.stockLimit - newUsedStock
              });

              // Financial calculations
              totalAmount += qty * (paymentMethod === "TON" ? book.priceTon : book.priceCard);
              tappingRate += qty * (book.tappingRate || 0);
              points += qty * Number(book.coinsReward || 0);
            }

            return { 
              totalAmount, 
              tappingRate, 
              points, 
              codes, 
              updatedStocks 
            };
          }

