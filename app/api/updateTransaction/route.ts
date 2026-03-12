import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { orderId, transactionReference } = await req.json();

    if (!orderId || !transactionReference) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { orderId },
      data: { transactionReference, status: "SUCCESS" },
    });

    return NextResponse.json({ success: true, updatedOrder }, { status: 200 });
  } catch (error) {
    console.error("Database update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
