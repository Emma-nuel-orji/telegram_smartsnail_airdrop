import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { prisma } from "../../lib/prisma"; // Adjust the path to your prisma client
import { sendPurchaseEmail } from "../../src/utils/emailUtils"; // Import your email function
import {
  verifyStarsPayment,
  initiateStarsPayment,
  
} from "../api/utils/paymentUtils";

const TELEGRAM_BOT_TOKEN = process.env.BOT_API;
const EMAIL_USER = process.env.SMARTSNAIL_EMAIL; // Email for sending the book
const EMAIL_PASS = process.env.SMARTSNAIL_PASSWORD; // Email password or app key

if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set in the environment variables");
}

const api = axios.create({
  baseURL: `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/`,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { email, amount, label, bookCount, paymentMethod, paymentData } = req.body;

    // Validate input data
    if (!email || !bookCount || bookCount < 1) {
      return res.status(400).json({ error: "Invalid request data" });
    }

     // Fetch user data including referrerId from the database
     const user = await prisma.user.findUnique({
      where: { email },
      select: {
        referredBy: true, // Fetch the referrerId of the user
      },
    });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const referrerId = user.referredBy; 


    // Fetch the required number of codes using Prisma
    const codes = await prisma.generatedCode.findMany({
      where: { isRedeemed: false },
      take: bookCount,
    });

    if (codes.length < bookCount) {
      return res.status(400).json({ error: "Not enough codes available" });
    }

    // Mark the codes as redeemed
    const codeIds = codes.map((code) => code.id);
    await prisma.generatedCode.updateMany({
      where: { id: { in: codeIds } },
      data: { isRedeemed: true },
    });

    // Fetch titles of purchased books
    const availableBooks = [
      { id: "fxckedUpBagsId", title: "Fxcked Up Bags" },
      { id: "humanRelationsId", title: "Human Relations" },
      // Add additional book entries as needed
    ];
    
    // Ensure we select books based on the user's purchase
    const selectedBooks = availableBooks.slice(0, bookCount); // Adjust the logic as needed
    
    // Create the purchases array with actual book IDs
    const purchases = selectedBooks.map((book) => ({ bookId: book.id }));
    
    // Extract purchased book IDs from the purchases array
    const purchasedBookIds = purchases.map((purchase) => purchase.bookId);
    
    // Fetch book details from the database based on the purchased book IDs
    const books = await prisma.book.findMany({
      where: { id: { in: purchasedBookIds } },
      select: { title: true },
    });
    
    // Extract the titles of the purchased books
    const bookTitles: string[] = books.map((book) => book.title);

    // Initiate Stars payment
    const paymentLink = await initiateStarsPayment(amount, label, paymentData, email);

    // Send email with book titles and codes
    const codeList = codes.map((code) => code.code);
    await sendPurchaseEmail(email, bookTitles, codeList);

    // Wait for payment verification
    const paymentVerified = await verifyStarsPayment(paymentData.transactionId, amount);

    if (!paymentVerified) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // Calculate the rewards and update the user's balance
    const totalTappingRate = bookCount * 5; // Adjust if needed
    const totalPoints = bookCount * 100000; // Adjust based on your reward logic

    // Update the user's coins and tapping rate based on purchase
    await prisma.user.update({
      where: { email },
      data: {
        points: {
          increment: totalPoints,
        },
        tappingRate: {
          increment: totalTappingRate,
        },
      },
    });

    // Reward referrer if applicable
if (referrerId && typeof referrerId === 'string') {
  await prisma.user.update({
    where: { id: referrerId },
    data: {
      points: {
        increment: 30000 * bookCount, // Referrer gets 30,000 coins per book purchased
      },
    },
  });
}


    res.status(200).json({ invoiceLink: paymentLink });
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
}