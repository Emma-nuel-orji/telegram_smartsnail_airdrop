import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {

  // STEP 1: Create SageCombat Partner
  const combatPartner = await prisma.partner.upsert({
    where: { id: "000000000000000000000000" }, // dummy, won't match anything
    update: {},
    create: {
      name: "SageCombat",
      type: "COMBAT",
    }
  });
  console.log("✅ SageCombat partner created → ID:", combatPartner.id);

  // STEP 2: Create SageCombat Service
  const combatService = await prisma.service.upsert({
    where: { id: "000000000000000000000000" },
    update: {},
    create: {
      name: "SageCombat",
      description: "SageCombat boxing and fitness training programs",
      type: "SUBSCRIPTION",
      partnerType: "COMBAT",
      priceShells: BigInt(0),
      priceStars: 0,
      active: true,
      partnerId: combatPartner.id,
    }
  });
  console.log("✅ SageCombat service created → ID:", combatService.id);
  console.log("📋 Copy this into SageCombat.tsx as SAGE_COMBAT_SERVICE_ID:", combatService.id);

  // STEP 3: Gym Plans
  const gymPartnerId = "684d8d8c86d4f1a3ebf72669"; // Lilburn Gym

  const gymPlans = [
    { name: "Starter Monthly Plan", duration: "1 Month",  priceShells: 250000, priceStars: 10 },
    { name: "3 Month Plan",         duration: "3 Months", priceShells: 300000, priceStars: 20 },
    { name: "6 Month Plan",         duration: "6 Months", priceShells: 350000, priceStars: 30 },
    { name: "1 Year Plan",          duration: "1 Year",   priceShells: 400000, priceStars: 40 },
  ];

  for (const plan of gymPlans) {
    const existing = await prisma.service.findFirst({
      where: { name: plan.name, partnerId: gymPartnerId }
    });

    if (existing) {
      // Update pricing if it already exists
      await prisma.service.update({
        where: { id: existing.id },
        data: { priceShells: BigInt(plan.priceShells), priceStars: plan.priceStars }
      });
      console.log(`🔄 Updated: "${plan.name}"`);
      continue;
    }

    const created = await prisma.service.create({
      data: {
        name: plan.name,
        type: "SUBSCRIPTION",
        partnerType: "GYM",
        duration: plan.duration,
        priceShells: BigInt(plan.priceShells),
        priceStars: plan.priceStars,
        active: true,
        partnerId: gymPartnerId,
      }
    });
    console.log(`✅ Created: "${created.name}" → ID: ${created.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());