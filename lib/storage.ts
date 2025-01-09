interface ReferralData {
  referrals: { [userId: string]: string[] };
  referredBy: { [userId: string]: string };
}

let storage: ReferralData = {
  referrals: {},
  referredBy: {}
};

export function saveReferral(userId: string, referrerId: string) {
  if (!storage.referrals[referrerId]) {
    storage.referrals[referrerId] = [];
  }
  storage.referrals[referrerId].push(userId);
  storage.referredBy[userId] = referrerId;
}

export function getReferrals(userId: string): string[] {
  return storage.referrals[userId] || [];
}

export function getReferrer(userId: string): string | null {
  return storage.referredBy[userId] || null;
}




// import { prisma } from '@/prisma/client';



// // Example: Save referral function
// export async function saveReferral(userId: string, referrerId: string) {
//   await prisma.referral.create({
//     data: {
//       referrerId: referrerId, 
//       referredId: userId,       
//     },
//   });
// }

// // Example: Get all referrals for a user
// export async function getReferrals(userId: string) {
//   const referrals = await prisma.referral.findMany({
//     where: {
//       referrerId: userId,
//     },
//   });
//   return referrals;
// }

// // Example: Get the referrer of a user
// export async function getReferrer(userId: string) {
//   const referral = await prisma.referral.findUnique({
//     where: { id: userId }, 
//     include: {
//       referrer: true, 
//     },
//   });
//   return referral?.referrerId; 
// }
