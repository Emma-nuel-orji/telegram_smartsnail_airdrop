import { prisma } from "./lib/prisma"; // Ensure this path is correct

async function testFindBooks() {
  const booksToFind = ["FxckedUpBags (Undo Yourself)", "Human Relations"];
  
  try {
    const books = await prisma.book.findMany({
      where: { title: { in: booksToFind } },
    });
    console.log("Books found:", books);
  } catch (error) {
    console.error("Error fetching books:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testFindBooks();
