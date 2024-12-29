import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Example: Save referral function
export async function saveReferral(userId: string, referrerId: string) {
  await prisma.referral.create({
    data: {
      referrerId: referrerId, 
      referredId: userId,       
    },
  });
}

// Example: Get all referrals for a user
export async function getReferrals(userId: string) {
  const referrals = await prisma.referral.findMany({
    where: {
      referrerId: userId,
    },
  });
  return referrals;
}

// Example: Get the referrer of a user
export async function getReferrer(userId: string) {
  const referral = await prisma.referral.findUnique({
    where: { id: userId }, 
    include: {
      referrer: true, 
    },
  });
  return referral?.referrerId; 
}
