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

  const books = await prisma.book.findMany({
    where: { title: { in: booksToFind } }
  });

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

      if (qty <= 0) return null;

      return {
        qty,
        id: book.id,
        title: book.title,
        bookId: book.id,
        book: {
          ...book,
          coinsReward: Number(book.coinsReward)
        }
      };
    })
    .filter((info): info is BookPurchaseInfo => info !== null);

  if (booksToPurchase.length === 0) {
    throw new Error("No valid books found for purchase");
  }

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
    // 1. AUTHENTICATION
    // ===============================
    const auth = await authenticateTelegramUser(req);

    if (!auth?.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const verifiedTelegramId = auth.telegramId.toString();
    console.log("2. Verified Telegram ID:", verifiedTelegramId);

    // ===============================
    // 2. BODY EXTRACTION
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
    // 3. VALIDATION
    // ===============================
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    if (!["TON", "CARD", "STARS"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    if (fxckedUpBagsQty <= 0 && humanRelationsQty <= 0) {
      return NextResponse.json({ error: "Select at least one book" }, { status: 400 });
    }

    // ===============================
    // 4. FETCH BOOKS FROM DB
    // ===============================
    const books = await prisma.book.findMany({
      where: {
        title: {
          in: [
            ...(fxckedUpBagsQty > 0 ? ["FxckedUpBags (Undo Yourself)"] : []),
            ...(humanRelationsQty > 0 ? ["Human Relations"] : []),
          ],
        },
      },
    });

    if (!books.length) {
      return NextResponse.json({ error: "Books not found" }, { status: 404 });
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
      const qty = book.title.includes("FxckedUpBags") ? fxckedUpBagsQty : humanRelationsQty;
      totalAmount += qty * Number(book.priceTon || 0);
      tappingRate += qty * Number(book.tappingRate || 0);
      coinsReward += qty * Number(book.coinsReward || 0);
      totalBooks += qty;
    }

    console.log("5. Calculated values:", { totalAmount, tappingRate, coinsReward, totalBooks });

    // ===============================
    // 6. PREPARE booksToPurchase (needed for email)
    // ===============================
    const booksToPurchase: BookPurchaseInfo[] = books
      .map(book => {
        const qty = book.title.includes("FxckedUpBags") ? fxckedUpBagsQty : humanRelationsQty;
        if (qty <= 0) return null;
        return {
          qty,
          id: book.id,
          title: book.title,
          bookId: book.id,
          book: { ...book, coinsReward: Number(book.coinsReward) }
        };
      })
      .filter((b): b is BookPurchaseInfo => b !== null);

    // ===============================
    // 7. TRANSACTION
    // ===============================
    const result = await prisma.$transaction(async (tx) => {

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

      // ---- processPayment ----
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

      // ---- updateDatabaseTransaction (stocks, codes, user points, EMAIL) ----
      await updateDatabaseTransaction(
        tx,
        booksToPurchase,
        paymentResult.purchaseId ? [] : [], // codes are fetched inside the function
        verifiedTelegramId,
        email,
        paymentMethod,
        totalAmount,
        tappingRate,
        coinsReward,
        paymentResult.orderId ?? order.orderId,
        referrerId || undefined
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
        error: error instanceof Error ? error.message : "Unknown error",
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

  const availableCodes = await tx.generatedCode.findMany({
    where: { isUsed: false, isReserved: false },
    take: totalQty,
    orderBy: { createdAt: 'asc' }
  });

  if (availableCodes.length < totalQty) {
    throw new Error("Insufficient stock for the requested quantity of books");
  }

  const codesToReserve = availableCodes.map(c => c.id);
  await tx.generatedCode.updateMany({
    where: { id: { in: codesToReserve } },
    data: { isReserved: true }
  });

  let codeIndex = 0;
  for (const { qty, book, title } of booksToPurchase) {
    if (!book) throw new Error(`Book details not found for ${title}`);

    const assignedCodes = availableCodes.slice(codeIndex, codeIndex + qty);
    codes.push(...assignedCodes.map(c => c.code));
    codeIndex += qty;

    const newUsedStock = book.usedStock + qty;
    updatedStocks.push({
      title,
      used: newUsedStock,
      available: book.stockLimit - newUsedStock
    });

    totalAmount += qty * (paymentMethod === "TON" ? book.priceTon : book.priceCard);
    tappingRate += qty * (book.tappingRate || 0);
    points += qty * Number(book.coinsReward || 0);
  }

  return { totalAmount, tappingRate, points, codes, updatedStocks };
}