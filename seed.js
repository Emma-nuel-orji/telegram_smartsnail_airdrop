import prisma from './lib/prisma.js';

 // Use the shared Prisma instance

async function main() {
  await prisma.book.createMany({
    data: [
      {
        id: 'FxckedUpBags',
        title: 'FxckedUpBags (Undo Yourself)',
        description: 'FxckedUpBags by <b>AlexanderTheSage</b> explores personal transformation and self-discipline, focusing on how mindset and choices shape success.',
        priceTon: 1.0,
        priceCard: 4,
        priceStars: 100,
        author: 'AlexanderTheSage',
        coinsReward: 100000,
        tappingRate: 4,
        stockLimit: 10000,
        usedStock: 0,
      },
      {
        id: 'HumanRelations',
        title: 'Human Relations',
        description: 'The book Human Relations by <b>Kennedy E. O.</b> was inspired by the need to properly educate individuals about the nature of life and its existence using the principles of human relations. The book which is in fourteen chapters discusses in detail the process of human relations as a tool for a better life and the best tool to deal with all individuals you meet in life.',
        priceTon: 1.0,
        author: 'Kennedy E. O.',
        priceStars: 100,
        priceCard: 4,
        coinsReward: 30000,
        tappingRate: 7,
        stockLimit: 10000,
        usedStock: 0,
      },
    ],
  });

  console.log('Books seeded');
}

main()
  .then(() => console.log('Seeding completed'))
  .catch((e) => console.error('Error seeding data:', e))
  .finally(async () => await prisma.$disconnect());
