import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { books, calculateStock } from '../bookInfo/bookinfo.js';  // Import books and helper functions

// Define a type for the book object
interface Book {
  id: string;
  title: string;
  stockLimit: number;
}

const prisma = new PrismaClient();
const app = express();

app.get('/api/stock', async (req: Request, res: Response) => {
  try {
    const bookStocks = await Promise.all(
      Object.values(books).map(async (book: Book) => {
        // Count of all generated codes for the book
        const totalAssigned = await prisma.generatedCode.count({
          where: { bookId: book.id },
        });

        // Fetch redeemed codes
        const redeemedCodes = await prisma.generatedCode.findMany({
          where: { bookId: book.id },
        });

        // Calculate remaining stock using the helper function
        const stockInfo = calculateStock(book, redeemedCodes);

        // Return book-specific stock details
        return {
          id: book.id,
          title: book.title,
          stockLimit: book.stockLimit, // Capped limit per book
          assigned: totalAssigned, // All generated codes
          used: stockInfo.split('/')[0], // Extract used stock from the "used/total" string
          remaining: book.stockLimit - Number(stockInfo.split('/')[0]), // Remaining stock
        };
      })
    );

    // Respond with stock data for all books
    res.status(200).json(bookStocks);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
