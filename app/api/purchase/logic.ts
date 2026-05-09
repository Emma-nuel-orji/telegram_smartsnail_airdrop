import { prisma } from '@/lib/prisma';
import { Prisma, Book } from '@prisma/client';
import { verifyTonPayment } from "@/src/utils/paymentUtils";
import { sendPurchaseEmail } from '@/src/utils/emailUtils';
import { ObjectId } from "mongodb";

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

interface BookMap {
  [key: string]: Book;
}

interface BookPurchaseInfo {
  title: string;
  qty: number;
  id: string; 
  bookId: string; 
  book: Omit<Book, 'coinsReward'> & { coinsReward: number };
}


// Environment variables validation
const requiredEnv = ["SECRET_KEY", "NEXT_PUBLIC_REDIRECT_URL"];
const redirectUrl = process.env.NEXT_PUBLIC_REDIRECT_URL || 'https://default.redirect.url';
const JSONbig = require('json-bigint');



export async function processPayment(
          tx: Prisma.TransactionClient,
          paymentMethod: string,
          paymentReference: string | null,
          totalAmount: number,
          userId: string | null,
          bookCount: number,
          bookId: string | null,
          fxckedUpBagsQty: number,
          humanRelationsQty: number
                ): Promise<{ success: boolean; message?: string; orderId?: string; purchaseId?: string }> {
          try {
            // 1. Handle Missing Reference (PENDING state)
            if (!paymentReference) {
              const orderId = `TON-${Date.now()}-${Math.random().toString(36).substring(7)}`;
              const order = await tx.order.create({
                data: {
                  orderId,
                  paymentMethod,
                  totalAmount,
                  status: "PENDING",
                },
              });
              return { success: true, orderId: order.orderId };
            }

            // 2. TON Verification
            if (paymentMethod === "TON") {
              const walletAddress = process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS;
              if (!walletAddress) throw new Error("Wallet address config missing");

              const isTonValid = await verifyTonPayment(walletAddress, totalAmount, paymentReference);
              if (!isTonValid) throw new Error("TON transaction invalid or not found");

              // 3. Find or Create Order
              let finalOrder = await tx.order.findFirst({
                where: {
                  OR: [{ orderId: paymentReference }, { transactionReference: paymentReference }]
                }
              });

                if (!finalOrder) {
                  finalOrder = await tx.order.create({
                    data: {
                      orderId: `TON-${Date.now()}`,
                      paymentMethod,
                      totalAmount,
                      status: "SUCCESS",
                      transactionReference: paymentReference,
                    }
                  });
                } else {
                  finalOrder = await tx.order.update({
                    where: { id: finalOrder.id },
                    data: { status: "SUCCESS", transactionReference: paymentReference }
                  });
                }

              // 4. User Lookup (CRITICAL FIX)
              if (!userId) throw new Error("User ID is required for TON purchases");
              const user = await tx.user.findUnique({
                where: { telegramId: BigInt(userId) }
              });

              if (!user) {
                console.error("❌ User not found for ID:", userId);
                await tx.order.update({
                  where: { id: finalOrder.id },
                  data: { status: "FAILED" }
                });
                return { success: false, message: "User not found. Money received but boost failed." };
              }

            // 5. Create Purchase
            const createdPurchase = await tx.purchase.create({
              data: {
                paymentType: "TON",
                amountPaid: Math.floor(totalAmount),
                booksBought: Math.floor(bookCount || 0),
                fxckedUpBagsQty: Math.floor(fxckedUpBagsQty || 0),
                humanRelationsQty: Math.floor(humanRelationsQty || 0),
                user: { connect: { id: user.id } },
                order: { connect: { id: finalOrder.id } },
                book: bookId ? { connect: { id: bookId } } : undefined,
              }
            });

                return {
                  success: true,
                  orderId: finalOrder.orderId,
                  purchaseId: createdPurchase.id
                };
              }

              throw new Error("Unsupported payment method");
            } catch (error: any) {
              console.error("🔥 Payment Process Crash:", error.message);
              throw error; // Transactions roll back on throw
            }
          }

  export async function updateDatabaseTransaction(
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
            console.log(`📘 Book ${id} before stock update: usedStock = ${book?.usedStock}, qty = ${qty}`);
            if (!book) throw new Error(`Book with ID "${id}" not found.`);
            purchasedBooks.push({ bookId: book.id, quantity: qty });
          }
          
          for (const { id, qty } of booksToPurchase) {
            // 1. First find the codes to mark as used
            const codesToUpdate = await tx.generatedCode.findMany({
              where: { 
                bookId: id,
                isUsed: false 
              },
              take: qty,
              select: { id: true }
            });
          
            // 2. Then update them
            await tx.generatedCode.updateMany({
              where: { 
                id: { in: codesToUpdate.map(c => c.id) } 
              },
              data: { isUsed: true }
            });
          
            // 3. Update book stock
            await tx.book.update({
              where: { id },
              data: { 
                usedStock: { increment: qty }
              }
            });
            console.log(`✅ Book ${id} stock incremented by ${qty}`);
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
        console.error("❌ Code mismatch: expected vs actual", {
          expected: codes.length,
          actual: generatedCodes.length,
          missingCodes: codes.filter(code => !generatedCodes.some(g => g.code === code)),
        });
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
        


        const totalBooksPurchased = booksToPurchase.reduce((sum, book) => sum + book.qty, 0);

            // 1. Calculate the boost duration (24 hours per book in milliseconds)
          const MS_PER_DAY = 24 * 60 * 60 * 1000;
          const boostDurationMs = totalBooksPurchased * MS_PER_DAY;

          const now = new Date();

          // 2. Determine the starting point for the boost
          // If user has an active boost, stack on top of it. Otherwise, start from now.
          const currentExpiry = user.boostExpiresAt && user.boostExpiresAt > now 
            ? user.boostExpiresAt 
            : now;

          const newBoostExpiry = new Date(currentExpiry.getTime() + boostDurationMs);


        // Update user points & tapping rate
       const updatedUser = await tx.user.update({
          where: { telegramId: BigInt(telegramId) },
          data: {
            tappingRate: { increment: tappingRate },
            points: { increment: points },
            boostExpiresAt: newBoostExpiry, // Apply the 24hr per book boost
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
                // Convert temporary reservations to permanent usage
            await tx.generatedCode.updateMany({
              where: { code: { in: codes } },
              data: {
                isUsed: true,
                isReserved: false, // Clear reservation flag
                purchaseId: purchase.id,
                usedAt: new Date() // Optional: track when codes were used
              }
            });


        // Send email with retry logic
        let retryCount = 0;
        while (retryCount < MAX_RETRIES) {
          try {
            console.log("📧 About to send email to:", email);
console.log("📚 purchasedBooks being passed:", JSON.stringify(purchasedBooks));
console.log("🔑 codes being passed:", codes);

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
          ...updatedUser,
          id: updatedUser.id.toString(), // Convert ObjectId to string
          telegramId: updatedUser.telegramId.toString(), // Convert BigInt to string
          boostExpiresAt: updatedUser.boostExpiresAt?.toISOString(), 
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

