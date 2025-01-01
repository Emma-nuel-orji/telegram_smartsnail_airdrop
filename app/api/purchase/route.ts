import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { prisma } from '@/prisma/client';


import {
  validateTransaction,
  verifyTonPayment,
  initiateFlutterwavePayment,
  verifyPayment,
} from "@/src/utils/paymentUtils";
import { sendPurchaseEmail } from '@/src/utils/emailUtils';
import { PendingTransaction } from '@prisma/client'; 


// import { redirectUrl } from "@/config/config";

interface Book {
  title: string;
  author: string;
  description: string;
  id: string;
  totalStock?: number;
}


const secretKey = process.env.SECRET_KEY; 
const requiredEnv = ["SECRET_KEY", "NEXT_PUBLIC_REDIRECT_URL"];
const redirectUrl = process.env.NEXT_PUBLIC_REDIRECT_URL || 'https://default.redirect.url'

requiredEnv.forEach((env) => {
  if (!process.env[env]) {
    throw new Error(`Environment variable ${env} is missing`);
  }
});


interface Order {
  id: string;
  orderId: string;
  paymentMethod: string;
  totalAmount: number;
  status: string;
  createdAt: Date;
  email?: string;
  telegramId?: string;
  fxckedUpBagsQty?: number;
  humanRelationsQty?: number;
  referrerId?: string;
  transactionId?: string;
  pendingTransactions?: PendingTransaction[];
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Purchase API is working" });
}

// Zod schema for request validation
const requestSchema = z.object({
  email: z.string().email(),
  paymentMethod: z.enum(["TON", "CARD"]),
  hmacSignature: z.string(),
  fxckedUpBagsQty: z.number().int().nonnegative().optional().default(0),
  humanRelationsQty: z.number().int().nonnegative().optional().default(0),
  telegramId: z.string(),
  paymentReference: z.string(),
  referrerId: z.string().optional(),
});

// Helper Functions
async function preparePurchaseData(fxckedUpBagsQty: number, humanRelationsQty: number) {
  const booksToPurchase = [];
  if (fxckedUpBagsQty > 0) {
    booksToPurchase.push({ title: "FxckedUpBags (Undo Yourself)", qty: fxckedUpBagsQty });
  }
  if (humanRelationsQty > 0) {
    booksToPurchase.push({ title: "Human Relations", qty: humanRelationsQty });
  }

  const bookTitles = booksToPurchase.map((book) => book.title);
  const books = await prisma.book.findMany({
    where: { title: { in: bookTitles } },
  });

  if (books.length === 0) {
    throw new Error("No valid books found for purchase.");
  }

  const bookMap: { [key: string]: Book } = books.reduce((map: { [key: string]: Book }, book: Book) => {
    map[book.title] = book;
    return map;
  }, {});
  
  return { booksToPurchase, bookMap };
}

type BookDetails = {
  tappingRate: number;
  points: number;
};

const details: Record<string, BookDetails> = {
  FxckedUpBags: { tappingRate: 5, points: 100000 },
  HumanRelations: { tappingRate: 2, points: 70000 },
};

async function validateStockAndCalculateTotals(
  booksToPurchase: any[], 
  bookMap: any, 
  paymentMethod: string
) {
  let totalAmount = 0;
  let totalTappingRate = 0;
  let totalPoints = 0;
  const codes: string[] = [];
  const updatedStocks: any[] = [];

  for (const book of booksToPurchase) {
    const { title, qty } = book;
    const bookDetails = bookMap[title];

    if (!bookDetails) throw new Error(`Book details not found for ${title}`);

    const availableCodes = await prisma.generatedCode.findMany({
      where: { bookId: bookDetails.id, isUsed: false },
      take: qty,
    });

    if (availableCodes.length < qty) {
      throw new Error(`Insufficient stock for ${title}`);
    }

    codes.push(...availableCodes.map((code: { code: string }) => code.code));

    totalAmount += qty * (paymentMethod === "TON" ? 1 : 3);
    const { tappingRate, points } = details[title];

    totalTappingRate += qty * tappingRate;
    totalPoints += qty * points;

    const totalStock = bookDetails.totalStock || 0;
    const usedStock = await prisma.generatedCode.count({
      where: { bookId: bookDetails.id, isUsed: true },
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
  paymentReference: string | null, // Optional before payment
  totalAmount: number,
  redirectUrl: string
) {
  // Step 1: Generate and return an order ID before payment
  if (!paymentReference) {
    const orderId = `TON-${Date.now()}`; // Generate a unique order ID

    // Save the pending order in the database
    await prisma.order.create({
      data: {
        orderId,
        paymentMethod,
        totalAmount,
        status: "PENDING",
      },
    });

    // Return the generated order ID
    return { orderId };
  }

  // Step 2: Verify payment after the wallet processes it
  if (paymentMethod === "TON") {
    const isTonPaymentValid = await verifyTonPayment(paymentReference, totalAmount);
    if (!isTonPaymentValid) {
      throw new Error("TON payment verification failed.");
    }

    // Update the order status to SUCCESS
    const orderId = paymentReference; // Assuming `paymentReference` is the orderId
    await prisma.order.update({
      where: { orderId },
      data: { status: "SUCCESS" },
    });

    return { message: `TON payment verified successfully for Order ID: ${orderId}.`, orderId };
  } 
  
  else if (paymentMethod === "CARD") {
    const paymentRef = `TX-${Date.now()}`;
    const amount = totalAmount.toFixed(2);

    const flutterwavePaymentResponse = await initiateFlutterwavePayment(
      paymentRef,
      amount,
      redirectUrl
    );

    if (!flutterwavePaymentResponse || !flutterwavePaymentResponse.success) {
      throw new Error("Flutterwave payment initiation failed.");
    }

    // Save Flutterwave payment details to the database
    const orderId = flutterwavePaymentResponse.orderId; // Assume orderId is part of Flutterwave response
    await prisma.order.update({
      where: { orderId },
      data: { status: "SUCCESS" },
    });

    return { message: "Flutterwave payment verified successfully.", orderId };
  } 
  
  else {
    throw new Error("Invalid payment method specified.");
  }
}



async function updateDatabaseTransaction(
  booksToPurchase: any[],
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
  const purchasedBooks: any[] = [];

  for (const { title, qty } of booksToPurchase) {
    const book = await tx.book.findFirst({ where: { title } });
    if (!book) throw new Error(`Book "${title}" not found.`);
    purchasedBooks.push({ bookId: book.id, quantity: qty });
  


      await tx.generatedCode.updateMany({
        where: { code: { in: codes } },
        data: { isUsed: true },
      });
    }

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
          create: generatedCodes.map(({ code, batchId }: { code: string; batchId: string }) => ({
            code,
            batchId,
          })),
        },
        
        bookId: booksToPurchase.length > 0
          ? booksToPurchase.every(book => book.id === booksToPurchase[0].id)
            ? booksToPurchase[0].id
            : booksToPurchase.map(book => book.id)
          : null,
      },
    });

    const user = await tx.user.upsert({
      where: { telegramId: BigInt(telegramId) }, // Convert to BigInt
      update: {
        tappingRate: { increment: totalTappingRate },
        points: { increment: totalPoints },
      },
      create: {
        telegramId: BigInt(telegramId), // Ensure the created entry also uses BigInt
        tappingRate: totalTappingRate,
        points: totalPoints,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    

    if (referrerId && referrerId !== telegramId) {
      const totalBooksPurchased = booksToPurchase.reduce((sum, book) => sum + book.qty, 0);
      const referrerReward = totalBooksPurchased * 20000;

      await tx.user.update({
        where: { telegramId: BigInt(referrerId) }, // Convert to BigInt
        data: { points: { increment: referrerReward } },
      });
      
    }

     // Email sending with retry mechanism
     let retryCount = 0;
     while (retryCount < MAX_RETRIES) {
       try {
         await sendPurchaseEmail(email, purchasedBooks, codes);
         console.log("Email sent successfully.");
         break; // Exit loop if email is sent successfully
       } catch (emailError) {
         retryCount++;
         console.error(`Error sending email (Attempt ${retryCount}):`, emailError);
 
         if (retryCount === MAX_RETRIES) {
           console.error("Maximum retry attempts reached. Email not sent.");
           throw new Error("Failed to send email after maximum retries.");
         }
       }
     }
 
     return user;
   });
 }

export async function POST(request: NextRequest) {
  let validatedData;
  
  try {
    const body = await request.json();
    validatedData = requestSchema.parse(body);
  } catch (error) {
    return NextResponse.json(
      { 
        error: "Invalid request data", 
        details: error instanceof z.ZodError ? error.errors : 'Unknown validation error' 
      },
      { status: 400 }
    );
  }

  const {
    email,
    paymentMethod,
    hmacSignature,
    fxckedUpBagsQty,
    humanRelationsQty,
    telegramId,
    paymentReference,
    referrerId,
  } = validatedData;

  if (fxckedUpBagsQty <= 0 && humanRelationsQty <= 0) {
    return NextResponse.json(
      { error: "At least one book must be purchased." },
      { status: 400 }
    );
  }

  try {
    const transactionData = `${telegramId}:${paymentMethod}:${paymentReference}`;
    const isValidSignature = validateTransaction(transactionData, hmacSignature, secretKey!);
  
    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid HMAC signature." },
        { status: 403 }
      );
    }
  
    const { booksToPurchase, bookMap } = await preparePurchaseData(fxckedUpBagsQty, humanRelationsQty);
  
    const { totalAmount, totalTappingRate, totalPoints, codes, updatedStocks } =
      await validateStockAndCalculateTotals(booksToPurchase, bookMap, paymentMethod);
  
    await processPayment(paymentMethod, paymentReference, totalAmount, redirectUrl);
  
    const user = await updateDatabaseTransaction(
      booksToPurchase,
      codes,
      telegramId,
      email,
      paymentMethod,
      totalAmount,
      totalTappingRate,
      totalPoints,
      referrerId
    );
  
    return NextResponse.json({
      message: `Purchase successful. Codes will be emailed to ${email}.`,
      updatedTappingRate: user.tappingRate,
      points: user.points,
      codes: codes,
      stockStatus: updatedStocks,
      redirectUrl: "/home",
    });
    
  } catch (error) {
    console.error("Purchase processing error:", error);
    return NextResponse.json(
      { 
        error: "An error occurred while processing the request.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}