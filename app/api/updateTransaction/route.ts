import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { authenticateTelegramUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateTelegramUser(req);

    // Only admins can manually update transactions
    if (!auth.isAuthenticated || !auth.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, transactionReference } = await req.json();

    if (!orderId || !transactionReference) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { orderId },
      data: { transactionReference, status: "SUCCESS" },
    });

    return NextResponse.json({ success: true, orderId: updatedOrder.orderId });

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}