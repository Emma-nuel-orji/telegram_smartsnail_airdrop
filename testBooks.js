// testBooks.js
import { prisma } from './lib/prisma.js';  // Use import with the correct path and extension

async function testFindBooks() {
  try {
    const booksToFind = ["FxckedUpBags (Undo Yourself)", "Human Relations"];
    const books = await prisma.book.findMany({
      where: {
        title: { in: booksToFind },
      },
    });
    console.log("Books found:", books);
  } catch (error) {
    console.error("Error fetching books:", error);
  } finally {
    await prisma.$disconnect();  // Close the database connection
  }
}

testFindBooks();
