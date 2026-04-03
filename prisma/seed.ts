import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const PARTNER_ID = "69cd1be69d551cabe5d1e3f2";

  const ageGroups = ['Adult', 'Youth', 'Kids'];
  const intensities = ['Regular', 'Private'];

  for (const age of ageGroups) {
    // Define Base Prices based on Age
    let baseShells = 25000;
    let baseStars = 150;

    if (age === 'Youth') {
      baseShells = 20000;
      baseStars = 120;
    } else if (age === 'Kids') {
      baseShells = 15000;
      baseStars = 90;
    }

    for (const level of intensities) {
      const isPrivate = level === 'Private';
      // Private sessions are 40% more expensive
      const multiplier = isPrivate ? 1.4 : 1;

      const plans = [
        { name: "Walk-In", dur: "1 Session", factor: 1 },
        { name: "3 Months", dur: "90 Days", factor: 10 }, // 10x walk-in price
        { name: "6 Months", dur: "180 Days", factor: 18 }, // Bulk discount
      ];

      for (const p of plans) {
        const finalShells = Math.round(baseShells * p.factor * multiplier);
        const finalStars = Math.round(baseStars * p.factor * multiplier);

        await prisma.service.create({
          data: {
            name: `${age} ${level} - ${p.name}`,
            type: "SUBSCRIPTION",
            duration: p.dur,
            priceShells: BigInt(finalShells),
            priceStars: finalStars,
            partnerId: PARTNER_ID,
            partnerType: "GYM",
            ageGroup: age,
            intensity: level,
            active: true,
          }
        });
      }
    }
  }
}

main().catch(console.error);