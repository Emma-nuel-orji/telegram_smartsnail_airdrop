import { prisma } from '@/prisma/client';

// ✅ Save referral function (Fix type mismatch)
export async function saveReferral(userId: string, referrerId: string) {
  if (!/^\d+$/.test(referrerId)) { // ✅ Ensure valid number format
    throw new Error("Invalid referrerId format");
  }

  await prisma.referral.create({
    data: {
      referrerId: BigInt(referrerId), // ✅ Convert to BigInt
      referredId: BigInt(userId), // ✅ Convert to BigInt
    },
  });
}

// ✅ Get all referrals for a user
export async function getReferrals(userId: string) {
  const referrals = await prisma.referral.findMany({
    where: {
      referrerId: BigInt(userId), // ✅ Convert to BigInt
    },
  });
  return referrals;
}

// ✅ Get the referrer of a user
export async function getReferrer(userId: string) {
  const referral = await prisma.referral.findFirst({
    where: { referredId: BigInt(userId) }, // ✅ Fix incorrect field
    select: { referrerId: true },
  });

  return referral?.referrerId?.toString() || null; // ✅ Convert BigInt to string if needed
}
