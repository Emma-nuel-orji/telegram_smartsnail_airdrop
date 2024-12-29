import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.book.createMany({
    data: [
      {
        id: 'FxckedUpBags',
        title: 'FxckedUpBags (Undo Yourself)',
        description: '<p>FxckedUpBags by <b>AlexanderTheSage</b> explores personal transformation and self-discipline, focusing on how mindset and choices shape success.',
        priceTon: 1.0,
        priceCard: 3.0,
        priceStars: 100,
        coinsReward: 100000,
        tappingRate: 5,
        stockLimit: 15000,
        usedStock: 0,
      },
      {
        id: 'HumanRelations',
        title: 'Human Relations',
        description: 'The book Human Relations by <b>Kennedy E. O.</b> was inspired by the need to properly educate individuals about the nature of life and its existence using the principles of human relations. The book which is in fourteen chapters discusses in detail the process of human relations as a tool for a better life and the best tool to deal with all individuals you meet in life',
        priceTon: 1.0,
        priceStars: 100,
        priceCard: 3.0,
        coinsReward: 100000,
        tappingRate: 2,
        stockLimit: 20000,
        usedStock: 0,
      },
    ],
  });

  console.log('Books seeded');
}

main()
  .then(() => {
    console.log('Seeding completed');
  })
  .catch((e) => {
    console.error('Error seeding data:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
