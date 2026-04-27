import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelegramUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    /* =========================
       1. AUTH (STANDARDIZED)
    ========================= */
    const auth = await authenticateTelegramUser(req as any);

    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json(
        { error: "Unauthorized", nfts: [] },
        { status: 401 }
      );
    }

    const telegramId = auth.telegramId;

    /* =========================
       2. FETCH USER + NFTs
    ========================= */
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        ownedNfts: {
          include: {
            collection: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ nfts: [] });
    }

    /* =========================
       3. SAFE SERIALIZATION
    ========================= */
    const data = JSON.parse(
      JSON.stringify(user.ownedNfts, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    /* =========================
       4. RESPONSE
    ========================= */
    return NextResponse.json({
      nfts: data,
    });

  } catch (error: any) {
    console.error("Assets API Error:", error);

    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}