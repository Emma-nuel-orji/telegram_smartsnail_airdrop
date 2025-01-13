import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
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
  totalTappingRate: number;
  totalPoints: number;
  codes: string[];
  updatedStocks: Array<{ title: string; stockStatus: string }>;
}

interface BookPurchaseInfo {
  title: string;
  qty: number;
  id?: string;
  bookId?: string;
  book?: Book;
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
  totalTappingRate: z.number().nonnegative(),
  totalPoints: z.number().nonnegative(),
  totalTon: z.number().nonnegative(),
  starsAmount: z.number().int().nonnegative(),
  fxckedUpBagsQty: z.number().int().nonnegative().optional().default(0),
  humanRelationsQty: z.number().int().nonnegative().optional().default(0),
  telegramId: z.string().optional().default(""),
  referrerId: z.string().optional().default(""),
  paymentReference: z.string(),
});

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
      validatedData.paymentReference,
      stockResults.totalAmount,
      process.env.NEXT_PUBLIC_REDIRECT_URL || ''
    );

    const userResult = await updateDatabaseTransaction(
      booksToPurchase,
      stockResults.codes,
      validatedData.telegramId,
      validatedData.email,
      validatedData.paymentMethod,
      stockResults.totalAmount,
      stockResults.totalTappingRate,
      stockResults.totalPoints,
      validatedData.referrerId
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

async function preparePurchaseData(fxckedUpBagsQty: number, humanRelationsQty: number) {
  console.log("Quantities requested:", { fxckedUpBagsQty, humanRelationsQty });

  if (fxckedUpBagsQty < 0 || humanRelationsQty < 0) {
    throw new Error("Book quantities cannot be negative");
  }

  if (fxckedUpBagsQty === 0 && humanRelationsQty === 0) {
    throw new Error("At least one book must be selected for purchase");
  }

  const books = await prisma.book.findMany({
    where: {
      title: { in: ["FxckedUpBags (Undo Yourself)", "Human Relations"] }
    }
  });

  if (!books || books.length === 0) {
    throw new Error("Required books not found in database");
  }

  const bookMap = books.reduce<Record<string, Book>>((acc, book) => {
    acc[book.title] = book;
    return acc;
  }, {});

  const booksToPurchase: BookPurchaseInfo[] = [];

  if (fxckedUpBagsQty > 0) {
    const fxckedUpBags = books.find(b => b.title === "FxckedUpBags (Undo Yourself");
    if (!fxckedUpBags) {
      throw new Error("FxckedUpBags not found in database");
    }
    booksToPurchase.push({
      qty: fxckedUpBagsQty,
      id: fxckedUpBags.id,
      title: fxckedUpBags.title,
      book: fxckedUpBags
    });
  }

  if (humanRelationsQty > 0) {
    const humanRelations = books.find(b => b.title === "Human Relations");
    if (!humanRelations) {
      throw new Error("HumanRelations not found in database");
    }
    booksToPurchase.push({
      qty: humanRelationsQty,
      id: humanRelations.id,
      title: humanRelations.title,
      book: humanRelations
    });
  }

  return { booksToPurchase, bookMap };
}

async function validateStockAndCalculateTotals(
  booksToPurchase: BookPurchaseInfo[],
  bookMap: BookMap,
  paymentMethod: string
): Promise<StockCalculationResult> {
  let totalAmount = 0;
  let totalTappingRate = 0;
  let totalPoints = 0;
  const codes: string[] = [];
  const updatedStocks: Array<{ title: string; stockStatus: string }> = [];

  for (const purchaseInfo of booksToPurchase) {
    const { id, title, qty, book } = purchaseInfo;

    if (!book) {
      throw new Error(`Book details not found for ${title}`);
    }

    const availableCodes = await prisma.generatedCode.findMany({
      where: { bookId: id, isUsed: false },
      take: qty,
    });

    if (availableCodes.length < qty) {
      throw new Error(`Insufficient stock for ${title}`);
    }

    codes.push(...availableCodes.map(code => code.code));
    totalAmount += qty * (paymentMethod === "TON" ? 1 : 2.3);
    
    const tappingRate = book.tappingRate || 0;
    const points = book.coinsReward || 0;

    totalTappingRate += qty * tappingRate;
    totalPoints += qty * Number(points);

    const totalStock = book.stockLimit || 0;
    const usedStock = await prisma.generatedCode.count({
      where: { bookId: id, isUsed: true },
    });

    updatedStocks.push({
      title,
      stockStatus: `${usedStock + qty}/${totalStock}`,
    });
  }

  return { totalAmount, totalTappingRate, totalPoints, codes, updatedStocks };
}

async function processPayment(
  paymentMethod: string,
  paymentReference: string | null,
  totalAmount: number,
  redirectUrl: string
) {
  if (!paymentReference) {
    const orderId = `TON-${Date.now()}`;
    await prisma.order.create({
      data: {
        orderId,
        paymentMethod,
        totalAmount,
        status: "PENDING",
      },
    });
    return { orderId };
  }

  if (paymentMethod === "TON") {
    const isTonPaymentValid = await verifyTonPayment(paymentReference, totalAmount);
    if (!isTonPaymentValid) {
      throw new Error("TON payment verification failed.");
    }
    
    await prisma.order.update({
      where: { orderId: paymentReference },
      data: { status: "SUCCESS" },
    });
    
    return { 
      message: `TON payment verified successfully for Order ID: ${paymentReference}.`,
      orderId: paymentReference 
    };
  } 
  else if (paymentMethod === "CARD") {
    const paymentRef = `TX-${Date.now()}`;
    const flutterwavePaymentResponse = await initiateFlutterwavePayment(
      paymentRef,
      totalAmount.toFixed(2),
      redirectUrl
    );

    if (!flutterwavePaymentResponse?.success) {
      throw new Error("Flutterwave payment initiation failed.");
    }

    await prisma.order.update({
      where: { orderId: flutterwavePaymentResponse.orderId },
      data: { status: "SUCCESS" },
    });

    return { 
      message: "Flutterwave payment verified successfully.",
      orderId: flutterwavePaymentResponse.orderId 
    };
  }
  
  throw new Error("Invalid payment method specified.");
}

async function updateDatabaseTransaction(
  booksToPurchase: BookPurchaseInfo[],
  codes: string[],
  telegramId: string,
  email: string,
  paymentMethod: string,
  totalAmount: number,
  totalTappingRate: number,
  totalPoints: number,
  referrerId?: string
) {
  const MAX_RETRIES = 3;

  return prisma.$transaction(async (tx) => {
    const purchasedBooks: { bookId: string; quantity: number }[] = [];

    for (const { id, qty } of booksToPurchase) {
      if (!id) continue;
      const book = await tx.book.findFirst({ where: { id } });
      if (!book) throw new Error(`Book with ID "${id}" not found.`);
      purchasedBooks.push({ bookId: book.id, quantity: qty });
    }

    await tx.generatedCode.updateMany({
      where: { code: { in: codes } },
      data: { isUsed: true },
    });

    const generatedCodes = await tx.generatedCode.findMany({
      where: { code: { in: codes } },
      select: { code: true, batchId: true },
    });

    if (generatedCodes.length !== codes.length) {
      throw new Error("Some codes are invalid or missing a batchId.");
    }

    await tx.purchase.create({
      data: {
        userId: telegramId,
        paymentType: paymentMethod,
        amountPaid: totalAmount,
        booksBought: booksToPurchase.reduce((sum, book) => sum + book.qty, 0),
        codes: {
          create: generatedCodes.map(({ code, batchId }) => ({
            code,
            batchId,
          })),
        },
        bookId: booksToPurchase.length > 0 
          ? booksToPurchase.every(book => book.id === booksToPurchase[0].id)
            ? booksToPurchase[0].id || "UnknownBook"
            : booksToPurchase.map(book => book.id).join(",") 
          : "NoBookSelected",
      }
    });

    const user = await tx.user.upsert({
      where: { telegramId: BigInt(telegramId) },
      update: {
        tappingRate: { increment: totalTappingRate },
        points: { increment: totalPoints },
      },
      create: {
        telegramId: BigInt(telegramId),
        tappingRate: totalTappingRate,
        points: totalPoints,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (referrerId && referrerId !== telegramId) {
      const referrerExists = await tx.user.findUnique({
        where: { telegramId: BigInt(referrerId) },
      });

      if (!referrerExists) {
        throw new Error("Referrer ID does not exist.");
      }

      const totalBooksPurchased = booksToPurchase.reduce((sum, book) => sum + book.qty, 0);
      const referrerReward = totalBooksPurchased * 20000;

      await tx.user.update({
        where: { telegramId: BigInt(referrerId) },
        data: { points: { increment: referrerReward } },
      });
    }

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

}

// export async function POST(request: NextRequest) {
//   try {
//     console.log("1. Starting POST request handling");
    
//     let body;
//     try {
//       body = await request.json();
//       console.log("2. Request body:", body);
//     } catch (error) {
//       console.error("Error parsing request body:", error);
//       return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
//     }

//     // Telegram validation
//     if (process.env.NODE_ENV !== 'development') {
//       console.log("3. Production environment - checking Telegram auth");
//       const initData = request.headers.get('x-telegram-init-data');
//       if (!initData) {
//         return NextResponse.json({ error: "Missing Telegram authentication" }, { status: 401 });
//       }

//       const telegramData = validateTelegramWebAppData(initData);
//       if (!telegramData) {
//         return NextResponse.json({ error: "Invalid Telegram authentication" }, { status: 403 });
//       }
//     } else {
//       console.log("3. Development environment - checking basic auth");
//       const { telegramId, email } = body;
//       if (!telegramId && !email) {
//         return NextResponse.json({ error: "Telegram ID or email must be provided." }, { status: 400 });
//       }
//     }

//     console.log("4. Validating schema");
//     let validatedData;
//     try {
//       validatedData = requestSchema.parse(body);
//       console.log("5. Validated data:", validatedData);
//     } catch (error) {
//       console.error("Schema validation error:", error);
//       return NextResponse.json(
//         {
//           error: "Invalid request data",
//           details: error instanceof z.ZodError ? error.errors : "Unknown validation error",
//         },
//         { status: 400 }
//       );
//     }

//     const {
//       email,
//       paymentMethod,
//       fxckedUpBagsQty,
//       humanRelationsQty,
//       telegramId,
//       paymentReference,
//       referrerId, 
//     } = validatedData;

//     console.log("6. Checking purchase quantities");
//     if (fxckedUpBagsQty <= 0 && humanRelationsQty <= 0) {
//       return NextResponse.json(
//         { error: "At least one book must be purchased." },
//         { status: 400 }
//       );
//     }

//     const redirectUrl = "/home";

//     try {
//       console.log("7. Preparing purchase data");
//       const { booksToPurchase, bookMap } = await preparePurchaseData(fxckedUpBagsQty, humanRelationsQty);
      
//       console.log("8. Validating stock and calculating totals");
//       const { totalAmount, totalTappingRate, totalPoints, codes, updatedStocks } =
//         await validateStockAndCalculateTotals(booksToPurchase, bookMap, paymentMethod);

//       console.log("9. Processing payment");
//       await processPayment(paymentMethod, paymentReference, totalAmount, redirectUrl);

//       console.log("10. Updating database");
//       const user = await updateDatabaseTransaction(
//         booksToPurchase,
//         codes,
//         telegramId,
//         email,
//         paymentMethod,
//         totalAmount,
//         totalTappingRate,
//         totalPoints,
//         referrerId
//       );

//       console.log("11. Purchase successful");
//       return NextResponse.json({
//         message: `Purchase successful. Codes will be emailed to ${email}.`,
//         updatedTappingRate: user.tappingRate,
//         points: user.points,
//         codes: codes,
//         stockStatus: updatedStocks,
//         redirectUrl: "/home",
//       });
//     } catch (error) {
//       console.error("Error in purchase processing:", error);
//       return NextResponse.json(
//         {
//           error: "An error occurred while processing the request.",
//           details: error instanceof Error ? error.message : "Unknown error",
//         },
//         { status: 500 }
//       );
//     }
//   } catch (outer_error) {
//     console.error("Outer error handler caught:", outer_error);
//     return NextResponse.json(
//       {
//         error: "An unexpected error occurred.",
//         details: outer_error instanceof Error ? outer_error.message : "Unknown error",
//       },
//       { status: 500 }
//     );
//   }
// }