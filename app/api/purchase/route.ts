import { NextRequest, NextResponse } from 'next/server';
import { z } from "zod";
import { ObjectId } from "mongodb";
import { prisma } from '@/lib/prisma';
import { PrismaClient, Book, Prisma } from '@prisma/client';
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
  paymentMethod: z.enum(["TON", "CARD"]),
  bookCount: z.number().int().nonnegative(),
  tappingRate: z.number().nonnegative(),           
  coinsReward: z.number().int().nonnegative(),           
  priceTon: z.number().nonnegative(),              
  priceStars: z.number().int().nonnegative(),      
  fxckedUpBagsQty: z.number().int().nonnegative().optional().default(0),
  humanRelationsQty: z.number().int().nonnegative().optional().default(0),
  telegramId: z.string().optional().default(""),
  referrerId: z.string().optional().default(""),
  // paymentReference: z.string().nullable(),
  paymentReference: z.string().optional().default(""),
  bookIds: z.array(z.string()).optional().default([]),
   orderId: z.string().nullable().optional(),

});

// console.log("Request Body:", req.body);
// console.log("Query Params:", req.query);
// console.log("Authenticated User:", req.user);


// const orderId = generatedOrderId ? String(generatedOrderId) : undefined;
// const userIdString = String(userId);
// const bookIdString = bookId ? String(bookId) : "";



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
  console.log("1. Starting POST request handling");

  try {
    const data = await req.json();
    console.log("2. Request body:", data);

    if (process.env.NODE_ENV !== 'development') 
      {
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
      if (!data.telegramId || !data.paymentMethod) {
        return NextResponse.json({ error: "Missing required fields: telegramId or paymentMethod" }, { status: 400 });
      }

      validatedData = requestSchema.parse(data);

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


    const result = await prisma.$transaction(async (tx) => {
      // Prepare purchase data
      const { booksToPurchase, bookMap } = await preparePurchaseData(
        validatedData.fxckedUpBagsQty,
        validatedData.humanRelationsQty
      );

     // Validate stock and calculate totals
      const stockResults = await validateStockAndCalculateTotals(
        tx,
        booksToPurchase,
        bookMap,
        validatedData.paymentMethod
      );

    // Process payment
      const paymentResult = await processPayment(
        tx,
        validatedData.paymentMethod,
        validatedData.paymentReference || "",
        stockResults.totalAmount,
        // process.env.NEXT_PUBLIC_REDIRECT_URL || '',
        validatedData.telegramId,
        validatedData.bookCount,
        Array.isArray(validatedData.bookIds) && validatedData.bookIds.length > 0
          ? validatedData.bookIds[0]
          : "",
        validatedData.fxckedUpBagsQty,
        validatedData.humanRelationsQty
      );


    const userResult = await updateDatabaseTransaction(
        tx,
        booksToPurchase,
        stockResults.codes,
        validatedData.telegramId,
        validatedData.email,
        validatedData.paymentMethod,
        stockResults.totalAmount,
        stockResults.tappingRate,
        stockResults.points,
        validatedData.orderId,
        validatedData.referrerId
      );
 const safeUser = {
        ...userResult,
        telegramId: userResult.telegramId.toString(),
        id: userResult.id.toString(),
        points: Number(userResult.points),
        tappingRate: Number(userResult.tappingRate)
      };

      return {
        success: true,
        message: "Purchase completed successfully",
        orderId: paymentResult.orderId,
        stockStatus: stockResults.updatedStocks,
        userUpdate: safeUser
      };
    }, {
      timeout: 30000,
      maxWait: 5000
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error in purchase processing:", error);
    
    let statusCode = 500;
    let errorMessage = "An unknown error occurred";

    if (error instanceof z.ZodError) {
      statusCode = 400;
      errorMessage = "Validation error";
    } else if (error instanceof Error) {
      errorMessage = error.message;
      statusCode = error.name === 'ValidationError' ? 400 : 500;
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: statusCode });
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
  let totalQty = 0;
  let updatedStocks: Array<{ title: string; stockStatus: string }> = [];

  for (const purchaseInfo of booksToPurchase) {
    const { qty, book } = purchaseInfo;
    if (!book) {
      throw new Error(`Book details not found for ${purchaseInfo.title}`);
    }
    totalQty += qty;
    tappingRate += qty * (book.tappingRate || 0);
    points += qty * Number(book.coinsReward || 0);
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
 export async function processPayment(
  tx: Prisma.TransactionClient, 
  paymentMethod: string,
  paymentReference: string | null,
  totalAmount: number,
  // redirectUrl: string,
  userId:  string | null,
  bookCount: number,
  bookId:  string | null,
  fxckedUpBagsQty: number,
  humanRelationsQty: number
): Promise<{ success: boolean; message?: string; orderId?: string; purchaseId?: string }> {
  try {
      console.log("🛠️ Received processPayment request with data:", {
        paymentMethod,
      paymentReference,
      totalAmount,
      // redirectUrl,
      userId,
      bookCount,
      bookId,
      fxckedUpBagsQty,
      humanRelationsQty,
    });
      // Check if paymentReference is missing
      if (!paymentReference) {
        console.warn("⚠️ Missing paymentReference! Creating a new order in PENDING state.");
        const orderId = `TON-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      
          const order = await tx.order.create({
            data: {
              orderId,
              paymentMethod,
              totalAmount,
              status: "PENDING",
              transactionReference: null,
            },
          });
          console.log("✅ New PENDING order created:", order);
  
          return { success: true, orderId: order.orderId };
      }

    function isPurchase(purchase: any): purchase is { id: string } {
      return purchase && typeof purchase.id === "string";
    }

      if (paymentMethod === "TON") {
        console.log("🔍 Verifying TON payment with transaction hash:", paymentReference);
    
        const walletAddress = process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS ?? ""; // Provide a default value
        if (!walletAddress) {
          throw new Error("Testnet wallet address is not defined");
        }
      const isTonPaymentValid = await verifyTonPayment(walletAddress, totalAmount, paymentReference);
        if (!isTonPaymentValid) {
          console.error("❌ TON payment verification failed: Invalid transaction.");
          throw new Error("TON payment verification failed: Invalid transaction");
        }
    
        // 🔹 Check for existing order
        console.log("🔍 Searching for existing order with reference:", paymentReference);
        const existingOrder = await tx.order.findFirst({
          where: {
            OR: [
              { orderId: paymentReference },
              { transactionReference: paymentReference }
            ]
          },
        });

         console.log("🔍 Existing order lookup result:", existingOrder);

        if (!existingOrder) {
          console.log("⚠️ No existing order found. Creating a new order.");
        } else {
          console.log("✅ Found existing order:", existingOrder);
        }
    
        let finalOrder;
        if (!existingOrder) {
          console.log("⚠️ No existing order found. Creating a new order.");
          const newOrderId = `TON-${Date.now()}-${Math.random().toString(36).substring(7)}`;


          finalOrder = await tx.order.create({
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


          finalOrder = await tx.order.update({
            where: { orderId: existingOrder.orderId },
            data: {
              status: "SUCCESS",
              transactionReference: paymentReference,
            },
          });
        }
        console.log("🔍 Order retrieved for processing:", finalOrder);


        // Add null check and error handling
        if (!finalOrder) {
          throw new Error("Failed to create or retrieve order");
        }
        // When fetching the order after creation, ensure you include the id field:

        console.log("🔍 Final order before retrieval:", finalOrder);

        const confirmedOrder = await tx.order.findUnique({
          where: { id: finalOrder.id },
          select: { id: true, orderId: true }
        });
        
        if (!confirmedOrder) {
          throw new Error("Order retrieval failed after creation.");
        }
        
        finalOrder = confirmedOrder;
        

        console.log("Final order for purchase creation:", finalOrder);


        // Only try to find the book if bookId is provided
        let book = null;
        let coinsReward = 0;
        
        if (bookId) {
          book = await tx.book.findUnique({
            where: { id: bookId },
          });
          
          if (book) {
            coinsReward = Math.floor(Number(book.coinsReward));
          }
        }

        
        // 🔹 Create Purchase Record
      try {
       
        const userIdNumber = Number(userId);
        if (!userId || isNaN(userIdNumber)) throw new Error("Invalid userId: userId must be a valid number");


             // Check if the User exists
             const user = await tx.user.findUnique({
              where: { telegramId: userIdNumber }, // Use telegramId to find the user
            });
        
            if (!user) {
              console.error(`User with telegramId ${userIdNumber} does not exist. Marking payment as pending.`);

            await tx.order.update({
                where: { orderId: finalOrder.orderId },
                data: { status: "PENDING" },
              });
              return { success: false, message: `User with telegramId ${userIdNumber} does not exist. Payment marked as pending.` };
            }

            // Validate bookCount
            console.log("bookCount:", bookCount);
            const booksBoughtValue = Math.floor(Number(bookCount || 0)); 
            console.log("booksBought value:", booksBoughtValue);

            console.log("Order details for connection:", {
            id: finalOrder.id,
            // _id: finalOrder._id, 
            orderId: finalOrder.orderId
          });
            

            const purchaseData: Prisma.PurchaseCreateInput = {
              paymentType: "TON",
              
              amountPaid: Math.floor(Number(totalAmount)),
              booksBought: Math.floor(Math.max(bookCount || 0, 0)),
              fxckedUpBagsQty: Math.floor(Number(fxckedUpBagsQty)),
              humanRelationsQty: Math.floor(Number(humanRelationsQty)),
              coinsReward: coinsReward,
              createdAt: new Date(),

             
              user: {
                connect: { id: user.id }, 
              },
              book: bookId ? { connect: { id: bookId } } : undefined, 
              // order: {
              //   connect: { orderId: finalOrder.orderId }
              // }
               order: { connect: { orderId: finalOrder.orderId } }, 
        };
            
        
            console.log("coinsReward type:", typeof purchaseData.coinsReward);
        
            if (typeof purchaseData.coinsReward !== "number") {
              throw new Error(`Invalid coinsReward type: ${typeof purchaseData.coinsReward}`);
            }
        
            const createdPurchase = await tx.purchase.create({
              data: purchaseData,
            });
        
            if (!createdPurchase) 
              throw new Error("Purchase creation failed");
            

        
          console.log("✅ Purchase record created:", createdPurchase);

          // Use the type guard to ensure purchase has an id property
          if (!isPurchase(createdPurchase)) {
            throw new Error("Purchase creation failed: Invalid purchase record");
          }
          return {
            success: true,
            message: `TON payment verified successfully for Order ID: ${finalOrder.orderId}`,
            orderId: finalOrder.orderId,
            purchaseId: createdPurchase.id,
          };
        } catch (error) {
          console.error("❌ Failed to create purchase record:", error);
          // Roll back the order status if purchase creation fails
          await tx.order.update({
            where: { orderId: finalOrder.orderId },
            data: { status: "FAILED" },
          });
          throw new Error("Failed to create purchase record");
        }
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
          success: true,
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
    tx: Prisma.TransactionClient, 
    booksToPurchase: BookPurchaseInfo[],
    codes: string[],
    telegramId: string,
    email: string,
    paymentMethod: string,
    totalAmount: number,
    tappingRate: number,
    points: number,
   orderId: string | null | undefined, 
    referrerId?: string
  ) {
    const MAX_RETRIES = 3;

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
 
      let totalCoinsReward = 0;

      if (booksToPurchase.length > 0) {
        const bookIds = booksToPurchase.map((book) => book.id); // Extract book IDs

        const books = await tx.book.findMany({
          where: { id: { in: bookIds } }, // Fetch books in one query
          select: { id: true, coinsReward: true },
        });

        // Sum up the total coinsReward as BigInt
        totalCoinsReward = books.reduce(
          (sum, book) => sum + Number(book.coinsReward ?? 0),
          0
        );
      }

      // Convert BigInt to Number if needed


      const purchaseData: {
        userId: string;
        paymentType: string;
        amountPaid: number;
        booksBought: number;
        fxckedUpBagsQty?: number;
        humanRelationsQty?: number;
        orderReference?: string; // Use orderReference instead of orderId
        coinsReward: number;
        bookId?: string;
        [key: string]: any;
      } = {
        userId: user.id,
        paymentType: paymentMethod,
        amountPaid: totalAmount,
        booksBought: booksToPurchase.reduce((sum, book) => sum + book.qty, 0),
        fxckedUpBagsQty: booksToPurchase.find((book) => book.title?.includes("FxckedUpBags"))?.qty || 0,
        humanRelationsQty: booksToPurchase.find((book) => book.title === "Human Relations")?.qty || 0,
        coinsReward: Number(totalCoinsReward), 
      };

      // Convert `bookId` safely
      if (booksToPurchase.length === 1 && booksToPurchase[0].id) {
        try {
          purchaseData.bookId = new ObjectId(booksToPurchase[0].id).toString();
        } catch (error) {
          console.error("Invalid bookId format:", booksToPurchase[0].id);
          throw new Error(`Invalid bookId format: ${booksToPurchase[0].id}`);
        }
      }

      // Ensure `orderReference` exists and is valid
      if (orderId) {
        purchaseData.orderReference = orderId;
      } else {
        // Generate a default orderReference if not provided
        purchaseData.orderReference = `AUTO-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        console.log(`Generated orderReference: ${purchaseData.orderReference}`);
      }

      // Remove `undefined` values
      Object.keys(purchaseData).forEach(
        (key) => purchaseData[key] === undefined && delete purchaseData[key]
      );

      // Debugging: Print final data before inserting
      const logData = { ...purchaseData, coinsReward: purchaseData.coinsReward.toString() };
      console.log("Final Purchase Data:",JSONbig.stringify(logData, null, 2));

      try {
        const purchase = await tx.purchase.create({
          data: purchaseData,
        });
        console.log("Purchase created successfully:", purchase.id);
        console.log("Total Coins Reward (BigInt):", totalCoinsReward.toString());
        console.log("Total Coins Reward (Number):", Number(totalCoinsReward));
        

        // Update user points & tapping rate
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

        // Mark codes as used
        await tx.generatedCode.updateMany({
          where: { code: { in: codes } },
          data: {
            isUsed: true,
            purchaseId: purchase.id,
          },
        });

        // Send email with retry logic
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



        return {
        ...user,
        telegramId: user.telegramId.toString(), 
      };

      } catch (error) {
        // Handle the 'error is of type unknown' issue by type checking
        if (error instanceof Error) {
          console.error("Purchase creation error details:", {
            error: error.message,
            code: (error as any).code, // Type assertion for potential Prisma error properties
            meta: (error as any).meta,
            data: logData,
          });
        } else {
          console.error("Unknown error type:", error);
        }
        throw error;
      }
  }

