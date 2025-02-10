import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma"; // Make sure your Prisma instance is correctly imported

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { orderId, transactionReference } = req.body;

  if (!orderId || !transactionReference) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const updatedOrder = await prisma.order.update({
      where: { orderId },
      data: { transactionReference, status: "SUCCESS" },
    });

    return res.json({ success: true, updatedOrder });
  } catch (error) {
    console.error("Database update error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
