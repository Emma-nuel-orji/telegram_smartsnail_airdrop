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
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const telegramId = auth.telegramId;

    /* =========================
       2. FETCH USER NFTs
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
      return NextResponse.json([]);
    }

    const nfts = user.ownedNfts || [];

    /* =========================
       3. FORMAT RESPONSE
    ========================= */
    const formattedNfts = nfts.map((nft) => ({
      id: nft.id,
      collection: nft.collection?.name || "Default",
      priceShells: nft.priceShells ? Number(nft.priceShells) : 0,
      imageUrl: nft.imageUrl,
      rarity: nft.rarity,
    }));

    /* =========================
       4. RESPONSE
    ========================= */
    return NextResponse.json(formattedNfts);

  } catch (error) {
    console.error("NFT Fetch Error:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}