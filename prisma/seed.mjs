import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Clear existing data first
  await prisma.book.deleteMany({});

  await prisma.book.createMany({
    data: [
      {
        title: 'FxckedUpBags (Undo Yourself)',  // Exact match for the search
        description:
          'FxckedUpBags by <b>AlexanderTheSage</b> explores personal transformation and self-discipline, focusing on how mindset and choices shape success.',
        priceTon: 1.0,
        priceCard: 4,
        priceStars: 400,
        author: 'AlexanderTheSage',
        coinsReward: BigInt(100000),
        tappingRate: 4,
        stockLimit: 10000,
        usedStock: 0,
      },
      {
        title: 'Human Relations',  // Exact match for the search
        description:
          'The book Human Relations by <b>Kennedy E. O.</b> was inspired by the need to properly educate individuals about the nature of life and its existence using the principles of human relations...',
        priceTon: 1.0,
        author: 'Kennedy E. O.',
        priceStars: 400,
        priceCard: 4,
        coinsReward: BigInt(30000),
        tappingRate: 7,
        stockLimit: 10000,
        usedStock: 0,
      },
    ],
  });

  // Verify the seeded data
  const books = await prisma.book.findMany();
  console.log('Seeded books:', books);
  
  // Double check the exact titles
  const titles = books.map(book => book.title);
  console.log('Seeded titles:', titles);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });