import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const PARTNER_ID = "69cd1be69d551cabe5d1e3f2";
  
  const gymPlans = [
    { name: "Walk-In", dur: "1 Session", shells: 15000, stars: 50 },
    { name: "1 Month", dur: "30 Days", shells: 80000, stars: 300 },
    { name: "3 Months", dur: "90 Days", shells: 200000, stars: 800 },
    { name: "6 Months", dur: "180 Days", shells: 350000, stars: 1400 },
    { name: "1 Year", dur: "365 Days", shells: 600000, stars: 2500 },
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