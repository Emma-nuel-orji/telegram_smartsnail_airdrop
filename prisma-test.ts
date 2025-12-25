// prisma-test.ts
import { prisma } from './prisma/client';

async function main() {
  console.log('Available Prisma models:', Object.keys(prisma));
  try {
    // Check if fight model exists and is accessible
    const fightCount = await prisma.fight.count();
    console.log('Fight count:', fightCount);
  } catch (error) {
    console.error('Error accessing the fight model:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();