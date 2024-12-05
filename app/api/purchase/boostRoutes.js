import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import express from "express";
import {
  validateTransaction,
  verifyTonPayment,
  initiateFlutterwavePayment, verifyPayment,
} from "../utils/paymentUtils";
import { sendPurchaseEmail } from "../../../src/utils/emailUtils";

const prisma = new PrismaClient();
const router = express.Router();

const secretKey = process.env.SECRET_KEY;
if (!secretKey) {
  throw new Error("SECRET_KEY environment variable is not set.");
}

// Zod schema for request validation
const requestSchema = z.object({
  email: z.string().email(),
  paymentMethod: z.enum(["TON", "CARD"]),
  hmacSignature: z.string(),
  fxckedUpBagsQty: z.number().int().nonnegative().optional(),
  humanRelationsQty: z.number().int().nonnegative().optional(),
  telegramId: z.string(),
  paymentReference: z.string(),
  referrerId: z.string().optional(), // Add referrerId as optional
});

// Main handler
router.post("/", async (req, res) => {
  let validatedData;

  try {
    validatedData = requestSchema.parse(req.body);
  } catch (error) {
    return res.status(400).json({ error: "Invalid request data", details: error.errors });
  }

  const {
    email,
    paymentMethod,
    hmacSignature,
    fxckedUpBagsQty = 0,
    humanRelationsQty = 0,
    telegramId,
    paymentReference,
    referrerId,
  } = validatedData;

  if (fxckedUpBagsQty <= 0 && humanRelationsQty <= 0) {
    return res.status(400).json({ error: "At least one book must be purchased." });
  }

  try {
    // Step 1: Validate HMAC signature
    const transactionData = `${telegramId}:${paymentMethod}:${paymentReference}`;
    const isValidSignature = validateTransaction(transactionData, hmacSignature, secretKey);

    if (!isValidSignature) {
      return res.status(403).json({ error: "Invalid HMAC signature." });
    }

    // Fetch user data including referrerId from the database
    const founduser = await prisma.user.findUnique({
      where: { email },
      select: {
        referrerId: true, // Fetch the referrerId of the user
      },
    });

    if (!founduser) {
      return res.status(400).json({ error: "User not found" });
    }

    const referrerId = founduser.referrerId; 

    // Step 3: Prepare purchase data
    const { booksToPurchase, bookMap } = await preparePurchaseData(fxckedUpBagsQty, humanRelationsQty);

    // Step 4: Validate stock and calculate totals
    const { totalAmount, totalTappingRate, totalPoints, codes, updatedStocks } =
      await validateStockAndCalculateTotals(booksToPurchase, bookMap, paymentMethod);

    // Step 5: Verify payment
    await processPayment(paymentMethod, paymentReference, totalAmount);

    // Step 6: Update database and reward referrer
    const user = await updateDatabaseTransaction(
      booksToPurchase,
      codes,
      telegramId,
      email,
      paymentMethod,
      totalAmount,
      totalTappingRate,
      totalPoints,
      referrerId // Pass referrerId to the transaction handler
    );

    return res.status(200).json({
      message: `Purchase successful. Codes will be emailed to ${email}.`,
      updatedTappingRate: user.tappingRate,
      points: user.points,
      codes: codes,
      stockStatus: updatedStocks,
      redirectUrl: "/home",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "An error occurred while processing the request." });
  }
});

// Helper Functions
async function preparePurchaseData(fxckedUpBagsQty, humanRelationsQty) {
  const booksToPurchase = [];
  if (fxckedUpBagsQty > 0) {
    booksToPurchase.push({ title: "FxckedUpBags", qty: fxckedUpBagsQty });
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

  const bookMap = books.reduce((map, book) => {
    map[book.title] = book;
    return map;
  }, {});

  return { booksToPurchase, bookMap };
}

async function validateStockAndCalculateTotals(booksToPurchase, bookMap, paymentMethod) {
  let totalAmount = 0;
  let totalTappingRate = 0;
  let totalPoints = 0;
  const codes = [];
  const updatedStocks = [];

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

    codes.push(...availableCodes.map((code) => code.code));

    totalAmount += qty * (paymentMethod === "TON" ? 1 : 3);
    const { tappingRate, points } = {
      FxckedUpBags: { tappingRate: 5, points: 100000 },
      HumanRelations: { tappingRate: 2, points: 70000 },
    }[title];

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

async function processPayment(paymentMethod, paymentReference, totalAmount) {
  const isValidPayment =
    paymentMethod === "TON"
      ? await verifyTonPayment(paymentReference, totalAmount)
      : await initiateFlutterwavePayment(paymentReference);

  if (!isValidPayment) {
    throw new Error(`${paymentMethod} payment verification failed.`);
  }
}

async function updateDatabaseTransaction(
  booksToPurchase,
  codes,
  telegramId,
  email,
  paymentMethod,
  totalAmount,
  totalTappingRate,
  totalPoints,
  referrerId
) {
  return prisma.$transaction(async (tx) => {
    const purchasedBooks = [];

    for (const { title, qty } of booksToPurchase) {
      const book = await tx.book.findUnique({ where: { title } });

      if (!book) throw new Error(`Book "${title}" not found.`);

      purchasedBooks.push({ bookId: book.id, quantity: qty });

      await tx.generatedCode.updateMany({
        where: { code: { in: codes } },
        data: { isUsed: true },
      });
    }

    await tx.purchase.create({
      data: {
        userId: telegramId,
        paymentType: paymentMethod,
        amountPaid: totalAmount,
        booksBought: booksToPurchase.reduce((sum, book) => sum + book.qty, 0),
        codes: codes,
      },
    });

    const user = await tx.user.upsert({
      where: { telegramId },
      update: {
        tappingRate: { increment: totalTappingRate },
        points: { increment: totalPoints },
      },
      create: {
        telegramId,
        email,
        tappingRate: totalTappingRate,
        points: totalPoints,
      },
    });

    // Reward referrer
    if (referrerId && referrerId !== telegramId) {
      const totalBooksPurchased = booksToPurchase.reduce((sum, book) => sum + book.qty, 0);
      const referrerReward = totalBooksPurchased * 30000; // 30,000 coins per book

      await tx.user.update({
        where: { telegramId: referrerId },
        data: { points: { increment: referrerReward } },
      });
    }

    try {
      await sendPurchaseEmail(email, purchasedBooks, codes);
    } catch (emailError) {
      console.error("Error sending email:", emailError);
    }

    return user;
  });
}

export default router;
