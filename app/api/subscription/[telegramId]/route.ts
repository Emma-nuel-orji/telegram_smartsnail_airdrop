import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelegramUser } from "@/lib/auth";

// Helper: BigInt safe serialization
function serialize(obj: any) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

export async function GET(req: Request) {
  try {
    /* =========================
       1. AUTH (STANDARDIZED)
    ========================= */
    const auth = await authenticateTelegramUser(req as any);

    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const telegramId = auth.telegramId;

    /* =========================
       2. QUERY PARAMS
    ========================= */
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");

    /* =========================
       3. FETCH SUBSCRIPTION
    ========================= */
    const subscription = await prisma.subscription.findFirst({
      where: {
        user: { telegramId },
        status: "ACTIVE",
        ...(partnerId && {
          service: { partnerId },
        }),
      },
      orderBy: { startDate: "desc" },
      include: {
        service: true,
      },
    });

    console.log(
      `🔍 [SUB CHECK] User: ${telegramId.toString()} | Partner: ${partnerId} | Found: ${!!subscription}`
    );

    if (!subscription) {
      return NextResponse.json({
        isActive: false,
        subscription: null,
      });
    }

    /* =========================
       4. VALIDATION
    ========================= */
    const today = new Date();
    const expiry = new Date(subscription.endDate);

    if (today > expiry) {
      return NextResponse.json({
        isActive: false,
        expired: true,
      });
    }

    /* =========================
       5. RESPONSE
    ========================= */
    const responseData = {
      ...subscription,
      isActive: true,
      planTitle: subscription.service?.name || "Standard Plan",
      daysRemaining: Math.max(
        0,
        Math.ceil(
          (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        )
      ),
    };

    return NextResponse.json(serialize(responseData));

  } catch (error) {
    console.error("🔥 Error fetching sub:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE (CANCEL SUB)
========================= */
export async function DELETE(req: Request) {
  try {
    /* 🔐 STANDARD AUTH */
    const auth = await authenticateTelegramUser(req as any);

    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const telegramId = auth.telegramId;

    const updated = await prisma.subscription.updateMany({
      where: {
        user: { telegramId },
        status: "ACTIVE",
      },
      data: {
        status: "CANCELLED",
      },
    });

    return NextResponse.json({
      success: updated.count > 0,
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}