// import { NextApiRequest, NextApiResponse } from "next";
// import prisma from "@/lib/prisma";
// import { sendPurchaseEmailWithRetry } from "@/utils/emailUtils";
// import { processReferralReward } from "@/utils/processReferralReward";

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method Not Allowed" });
//   }

//   try {
//     const { payment_data } = req.body;
//     const payloadData = JSON.parse(payment_data.payload);
//     const { email, bookCount, referrerId, tappingRate, totalPoints } = payloadData;

//     if (!Number.isInteger(bookCount) || bookCount <= 0) {
//       throw new Error("Invalid bookCount value");
//     }

//     const pendingTransaction = await prisma.pendingTransaction.findFirst({
//       where: {
//         email,
//         status: "PENDING",
//         payloadData: payment_data.payload,
//       },
//     });

//     if (!pendingTransaction) {
//       throw new Error("Transaction not found");
//     }

//     await prisma.$transaction(async (prismaClient) => {
//       const codes = await prismaClient.generatedCode.findMany({
//         where: { isRedeemed: false },
//         take: bookCount,
//       });

//       if (codes.length < bookCount) {
//         throw new Error("Insufficient codes available");
//       }

//       await prismaClient.generatedCode.updateMany({
//         where: { id: { in: codes.map((code) => code.id) } },
//         data: { isRedeemed: true },
//       });

//       // Update user points and tapping rate
//       await prismaClient.user.update({
//         where: { email },
//         data: {
//           points: { increment: totalPoints },
//           tappingRate: { increment: tappingRate },
//         },
//       });

//       if (referrerId) {
//         await processReferralReward(prismaClient, referrerId, bookCount);
//       }

//       // Email sending with retry mechanism
//       await sendPurchaseEmailWithRetry(email, codes.map((code) => code.code));

//       await prismaClient.pendingTransaction.update({
//         where: { id: pendingTransaction.id },
//         data: { status: "COMPLETED" },
//       });
//     });

//     res.status(200).json({ success: true });
//   } catch (error) {
//     console.error("Error processing webhook:", error);
//     res.status(500).json({
//       error: error instanceof Error ? error.message : "An unexpected error occurred",
//     });
//   }
// }
