import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Example: Save referral function
export async function saveReferral(userId: string, referrerId: string) {
  await prisma.referral.create({
    data: {
      referredBy: referrerId, // The referrer's ID
      referredTo: userId,     // The referred user's ID (this was missing)
      userId: userId,         // The referred user's ID (already present)
    },
  });
}

// Example: Get all referrals for a user
export async function getReferrals(userId: string) {
  const referrals = await prisma.referral.findMany({
    where: {
      referredBy: userId, // Get all referrals where this user is the referrer
    },
  });
  return referrals;
}

// Example: Get the referrer of a user
export async function getReferrer(userId: string) {
  const referral = await prisma.referral.findUnique({
    where: { id: userId }, // Use userId to query the referral
    include: {
      referredByUser: true, // Make sure to include the referrer relation
    },
  });
  return referral?.referredByUser; // Return the referrer if it exists
}
