import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const PARTNER_ID = "69cd1be69d551cabe5d1e3f2";
  
const gymPlans = [
  { name: "Walk-In", dur: "1 Day", shells: 15000, stars: 50 },
  { name: "1 Week", dur: "1 Week", shells: 25000, stars: 100 },
  { name: "1 Month", dur: "1 Month", shells: 80000, stars: 300 },
  { name: "3 Months", dur: "3 Months", shells: 200000, stars: 800 },
  { name: "6 Months", dur: "6 Months", shells: 350000, stars: 1400 },
  { name: "1 Year", dur: "1 Year", shells: 600000, stars: 2500 },
];

  for (const p of gymPlans) {
    await prisma.service.create({
      data: {
        name: p.name,
        type: "SUBSCRIPTION",
        duration: p.dur,
        priceShells: BigInt(p.shells),
        priceStars: p.stars,
        partnerId: PARTNER_ID,
        partnerType: "GYM", // Keeping it separate from COMBAT
        active: true,
      }
    });
  }
}

main().catch(console.error);