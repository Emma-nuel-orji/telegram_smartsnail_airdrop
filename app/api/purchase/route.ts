import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { ObjectId } from "mongodb";
import { prisma } from '@/lib/prisma';
import { PrismaClient, Book } from '@prisma/client';
import {
  verifyTonPayment,
  initiateFlutterwavePayment,
  verifyPayment,
} from "@/src/utils/paymentUtils";
import { sendPurchaseEmail } from '@/src/utils/emailUtils';
import { validateTelegramWebAppData } from '@/src/utils/telegram';

// Type definitions
interface StockCalculationResult {
  totalAmount: number;
  tappingRate: number;
  points: number;
  codes: string[];
  updatedStocks: Array<{ title: string; stockStatus: string }>;
}

interface BookPurchaseInfo {
  title: string;
  qty: number;
  id: string; // Make this required
  bookId: string; // Make this required
  book: Book; // Make this required
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




requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    throw new Error(`Environment variable ${env} is missing`);
  }
});

// Zod schema for request validation
const requestSchema = z.object({
  email: z.string().email(),
  paymentMethod: z.enum(["TON", "CARD"]),
  bookCount: z.number().int().nonnegative(),
  tappingRate: z.number().nonnegative(),           // Changed to match schema
  coinsReward: z.number().nonnegative(),           // Changed to match schema
  priceTon: z.number().nonnegative(),              // Changed to match schema
  priceStars: z.number().int().nonnegative(),      // Changed to match schema
  fxckedUpBagsQty: z.number().int().nonnegative().optional().default(0),
  humanRelationsQty: z.number().int().nonnegative().optional().default(0),
  telegramId: z.string().optional().default(""),
  referrerId: z.string().optional().default(""),
  // paymentReference: z.string().nullable(),
  paymentReference: z.string().optional().default(""),
  bookId: z.string().optional().default(""), 
  orderId: z.string().optional(),
  
});



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

      return {
        qty,
        id: book.id,
        title: book.title,
        bookId: book.id,
        book // Make sure book object is included
      };
    })
    .filter((info): info is BookPurchaseInfo => info !== null);

  if (booksToPurchase.length === 0) {
    throw new Error("No valid books found for purchase");
  }

  console.log("Final booksToPurchase:", booksToPurchase);

  // Create bookMap from the books array
  const bookMap = Object.fromEntries(books.map(book => [book.title, book]));

  return { booksToPurchase, bookMap };
}


export async function POST(req: NextRequest): Promise<Response> {
  console.log("1. Starting POST request handling");
  
  try {
    const data = await req.json();
    console.log("2. Request body:", data);

    if (process.env.NODE_ENV !== 'development') {
      console.log("3. Production environment - checking Telegram auth");
      
      // Use 'req' instead of 'request'
      const initData = req.headers.get('x-telegram-init-data');  
      
      if (!initData) {
        return NextResponse.json({ error: "Missing Telegram authentication" }, { status: 401 });
      }

      const telegramData = validateTelegramWebAppData(initData);
      if (!telegramData) {
        return NextResponse.json({ error: "Invalid Telegram authentication" }, { status: 403 });
      }
    } else {
      console.log("3. Development environment - checking basic auth");
      const { telegramId, email } = data;  // Use 'data' here instead of 'body'
      if (!telegramId && !email) {
        return NextResponse.json({ error: "Telegram ID or email must be provided." }, { status: 400 });
      }
    }

    console.log("4. Validating schema");
    let validatedData;
    try {
      validatedData = requestSchema.parse(data);  // Use 'data' instead of 'body'
      console.log("5. Validated data:", validatedData);
    } catch (error) {
      console.error("Schema validation error:", error);
      return NextResponse.json(
        {
          error: "Invalid request data",
          details: error instanceof z.ZodError ? error.errors : "Unknown validation error",
        },
        { status: 400 }
      );
    }

  
    console.log("6. Checking purchase quantities");
    if (validatedData.fxckedUpBagsQty < 0 || validatedData.humanRelationsQty < 0) {
      throw new Error("Invalid purchase quantities");
    }

    console.log("7. Preparing purchase data");
    const { booksToPurchase, bookMap } = await preparePurchaseData(
      validatedData.fxckedUpBagsQty,
      validatedData.humanRelationsQty
    );

    const stockResults = await validateStockAndCalculateTotals(
      booksToPurchase,
      bookMap,
      validatedData.paymentMethod
    );

    const paymentResult = await processPayment(
      validatedData.paymentMethod,
      validatedData.paymentReference || "",
      stockResults.totalAmount,
      process.env.NEXT_PUBLIC_REDIRECT_URL || '',
      validatedData.telegramId,
      validatedData.bookCount, 
      validatedData.bookId, 
      validatedData.fxckedUpBagsQty, 
      validatedData.humanRelationsQty 
    );
    

    const userResult = await updateDatabaseTransaction(
      booksToPurchase,
      stockResults.codes,
      validatedData.telegramId,
      validatedData.email,
      validatedData.paymentMethod,
      stockResults.totalAmount,
      stockResults.tappingRate,
      stockResults.points,
      validatedData.referrerId,
      validatedData.orderId,
    );

    return new NextResponse(JSON.stringify({
      success: true,
      message: "Purchase completed successfully",
      orderId: paymentResult.orderId,
      stockStatus: stockResults.updatedStocks,
      userUpdate: userResult
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error in purchase processing:", error);
    
    // Properly type the error response
    let statusCode = 500;
    let errorMessage = "An unknown error occurred";

    if (error instanceof z.ZodError) {
      statusCode = 400;
      errorMessage = "Validation error";
    } else if (error instanceof Error) {
      errorMessage = error.message;
      // You can add more specific error type checks here
      statusCode = error.name === 'ValidationError' ? 400 : 500;
    }
  
    return new NextResponse(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}


async function validateStockAndCalculateTotals(
booksToPurchase: BookPurchaseInfo[], bookMap: { [k: string]: { tappingRate: number; coinsReward: bigint; priceTon: number; priceStars: number; id: string; description: string; author: string; priceCard: number; stockLimit: number; title: string; usedStock: number; }; }, paymentMethod: string): Promise<StockCalculationResult> {
  let totalAmount = 0;
  let tappingRate = 0;
  let points = 0;
  const codes: string[] = [];
  
  // Go through the books and calculate total quantity
  let totalQty = 0;
  let updatedStocks: Array<{ title: string; stockStatus: string }> = []; 
  
  for (const purchaseInfo of booksToPurchase) {
    const { qty, book } = purchaseInfo;

    // Validate book data
    if (!book) {
      console.error(`Missing book data for ${purchaseInfo.title}`);
      throw new Error(`Book details not found for ${purchaseInfo.title}`);
    }

    // Add the quantity of books to the total quantity
    totalQty += qty;

    const bookTappingRate = book.tappingRate || 0;
    const bookPoints = book.coinsReward || 0;

    tappingRate += qty * bookTappingRate;

    // Convert all values to number for consistent calculation
    points += qty * Number(bookPoints);
    
    // Calculate total amount based on payment method
    totalAmount += qty * (paymentMethod === "TON" ? 1 : 2.3);
  }

  // Fetch the unused codes based on the total quantity of books to purchase
  const availableCodes = await prisma.generatedCode.findMany({
    where: { isUsed: false },
    take: totalQty, // Fetch as many codes as the user is purchasing
  });

  if (availableCodes.length < totalQty) {
    throw new Error("Insufficient stock for the requested quantity of books");
  }

  // Push the codes into the codes array
  codes.push(...availableCodes.map(code => code.code));

  return { totalAmount, tappingRate, points, codes, updatedStocks };

}

async function processPayment(
  paymentMethod: string,
  paymentReference: string | null, // This must be the actual transaction hash
  totalAmount: number,
  redirectUrl: string,
  userId: string, // Added userId for purchase creation
  bookCount: number,
  bookId: string,
  fxckedUpBagsQty: number,
  humanRelationsQty: number
) {
  try {
    console.log("🛠️ Received processPayment request with data:", {
      paymentMethod,
      paymentReference,
      totalAmount,
      redirectUrl,
    });

    // Check if paymentReference is missing
    if (!paymentReference) {
      console.warn("⚠️ Missing paymentReference! Creating a new order in PENDING state.");
      const orderId = `TON-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newOrder = await prisma.order.create({
        data: {
          orderId,
          paymentMethod,
          totalAmount,
          status: "PENDING",
          transactionReference: null,
        },
      });

      console.log("✅ New PENDING order created:", { orderId: newOrder.orderId });
      return { orderId: newOrder.orderId };
    }

    // 🔹 TON Payment Verification Flow
    if (paymentMethod === "TON") {
      console.log("🔍 Verifying TON payment with transaction hash:", paymentReference);
      
      const isTonPaymentValid = await verifyTonPayment(paymentReference, totalAmount);
      if (!isTonPaymentValid) {
        console.error("❌ TON payment verification failed: Invalid transaction.");
        throw new Error("TON payment verification failed: Invalid transaction");
      }

      // 🔹 Check for existing order
      console.log("🔍 Searching for existing order with reference:", paymentReference);
      const existingOrder = await prisma.order.findFirst({
        where: {
          OR: [
            { orderId: paymentReference },
            { transactionReference: paymentReference }
          ]
        },
      });

      let finalOrder;
      if (!existingOrder) {
        console.log("⚠️ No existing order found. Creating a new order.");
        const newOrderId = `TON-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        finalOrder = await prisma.order.create({
          data: {
            orderId: newOrderId,
            paymentMethod,
            totalAmount,
            status: "SUCCESS",
            transactionReference: paymentReference,
          },
        });
        console.log("✅ New SUCCESS order created:", finalOrder);
      } else {
        console.log("✅ Existing order found. Updating order status to SUCCESS.");
        finalOrder = await prisma.order.update({
          where: { orderId: existingOrder.orderId },
          data: {
            status: "SUCCESS",
            transactionReference: paymentReference,
          },
        });
      }

      // 🔹 Create Purchase Record
      try {
        const purchase = await prisma.purchase.create({
          data: {
            userId,
            paymentType: "TON",
            amountPaid: totalAmount,
            booksBought: bookCount,
            orderId: finalOrder.id,
            bookId,
            fxckedUpBagsQty,
            humanRelationsQty,
          },
        });
        console.log("✅ Purchase record created:", purchase);
      } catch (error) {
        console.error("❌ Failed to create purchase record:", error);
        return { success: false, error: "Failed to create purchase record" };
      }

      return {
        success: true,
        message: `TON payment verified successfully for Order ID: ${finalOrder.orderId}`,
        orderId: finalOrder.orderId,
      };
    }

 
    // CARD payment flow
    if (paymentMethod === "CARD") {
      console.log("🔵 Initiating Flutterwave payment...");
      const paymentRef = `TX-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const flutterwavePaymentResponse = await initiateFlutterwavePayment(
        paymentRef,
        totalAmount.toFixed(2),
        redirectUrl
      );

      if (!flutterwavePaymentResponse?.success) {
        console.error("❌ Flutterwave payment initiation failed: Invalid response.");
        throw new Error("Flutterwave payment initiation failed: Invalid response");
      }

      console.log("✅ Flutterwave payment successful. Updating order status.");
      const updatedOrder = await prisma.order.update({
        where: { orderId: flutterwavePaymentResponse.orderId },
        data: {
          status: "SUCCESS",
          transactionReference: paymentRef,
        },
      });

      return {
        message: "Flutterwave payment verified successfully",
        orderId: updatedOrder.orderId,
      };
    }

    throw new Error(`Invalid payment method: ${paymentMethod}`);
  } catch (error) {
    // Enhanced error handling
    const errorMessage = error instanceof Error ? error.message : "Unknown payment processing error";
    console.error("❌ Payment processing error:", errorMessage);
    throw new Error(errorMessage);
  }
}



async function updateDatabaseTransaction(
  booksToPurchase: BookPurchaseInfo[],
  codes: string[],
  telegramId: string,
  email: string,
  paymentMethod: string,
  totalAmount: number,
  tappingRate: number,
  points: number,
  orderId: string | null,
  referrerId?: string
) {
  const MAX_RETRIES = 3;

  return prisma.$transaction(async (tx) => {
    // Validate books first
    const purchasedBooks: { bookId: string; quantity: number }[] = [];
    for (const { id, qty } of booksToPurchase) {
      if (!id) continue;
      const book = await tx.book.findFirst({ where: { id } });
      if (!book) throw new Error(`Book with ID "${id}" not found.`);
      purchasedBooks.push({ bookId: book.id, quantity: qty });
    }

    // Fetch or create user
    let user = await tx.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          telegramId: BigInt(telegramId),
          email,
          tappingRate: 1,
          points: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Validate codes
    const generatedCodes = await tx.generatedCode.findMany({
      where: { code: { in: codes } },
      select: { code: true, batchId: true },
    });

    if (generatedCodes.length !== codes.length) {
      throw new Error("Some codes are invalid or missing a batchId.");
    }

    // Create purchase first so we have the purchase ID
    console.log("📌 Reached purchase creation function"); 

    console.log("🛠 Data being inserted into Prisma:", {
      userId: user.id,
      paymentType: paymentMethod,
      amountPaid: totalAmount,
      booksBought: booksToPurchase.reduce((sum, book) => sum + book.qty, 0),
      orderId: orderId ? orderId : null,
      bookId: booksToPurchase.length === 1 ? booksToPurchase[0].id : "",
      fxckedUpBagsQty:
        booksToPurchase.find((book) => book.title?.includes("FxckedUpBags"))?.qty || 0,
      humanRelationsQty:
        booksToPurchase.find((book) => book.title === "Human Relations")?.qty || 0,
    });
    
    const purchase = await tx.purchase.create({
      data: {
        userId: user.id,
        paymentType: paymentMethod,
        amountPaid: totalAmount,
        booksBought: booksToPurchase.reduce((sum, book) => sum + book.qty, 0),
        orderId: orderId ? orderId : null,
        bookId: booksToPurchase.length === 1 ? booksToPurchase[0].id : "",
        fxckedUpBagsQty:
          booksToPurchase.find((book) => book.title?.includes("FxckedUpBags"))?.qty || 0,
        humanRelationsQty:
          booksToPurchase.find((book) => book.title === "Human Relations")?.qty || 0,
      },
    });
    

    // Update codes with purchase ID
    await tx.generatedCode.updateMany({
      where: { code: { in: codes } },
      data: { 
        isUsed: true,
        purchaseId: purchase.id,
      },
    });

    // Update user points and tapping rate
    await tx.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: {
        tappingRate: { increment: tappingRate },
        points: { increment: points },
      },
    });

    // Handle referrer bonus
    if (referrerId && referrerId !== telegramId) {
      const referrer = await tx.user.findUnique({
        where: { telegramId: BigInt(referrerId) },
      });

      if (!referrer) {
        throw new Error("Referrer ID does not exist.");
      }

      const totalBooksPurchased = booksToPurchase.reduce((sum, book) => sum + book.qty, 0);
      const referrerReward = totalBooksPurchased * 20000;

      await tx.user.update({
        where: { telegramId: BigInt(referrerId) },
        data: { points: { increment: referrerReward } },
      });
    }

    // Attempt to send purchase email with retry logic
    let retryCount = 0;
    while (retryCount < MAX_RETRIES) {
      try {
        await sendPurchaseEmail(email, purchasedBooks, codes);
        break;
      } catch (emailError) {
        retryCount++;
        if (retryCount === MAX_RETRIES) {
          throw new Error("Failed to send email after maximum retries.");
        }
      }
    }

    return user;
  });
}

// ✅ Ensure this function is correctly defined
async function sendPurchaseEmail(
  email: string,
  books: { bookId: string; quantity: number }[],
  codes: string[]
) {
  console.log(`Sending email to ${email}...`);
  return new Promise((resolve) => setTimeout(resolve, 1000)); // Simulated delay
}
};