import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNftData } from "@/lib/nftHelpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const collection = searchParams.get("collection")?.toLowerCase();
  const rarity = searchParams.get("rarity") || "All";
  const page = Number(searchParams.get("page") || 1);

  const limit = 20;
  const TOTAL_SIZE = 6000;

  let startNumber = (page - 1) * limit + 1;

  /* =========================
     1. FETCH ONLY NEEDED SOLD NFTs
  ========================= */
  const relevantIndexes = Array.from({ length: limit }, (_, i) => startNumber + i);

  const soldFromDb = await prisma.nft.findMany({
    where: {
      isSold: true,
      indexNumber: { in: relevantIndexes },
      ...(collection && {
        collection: {
          name: { equals: collection, mode: "insensitive" },
        },
      }),
    },
    select: {
      indexNumber: true,
      collection: { select: { name: true } },
    },
  });

  const soldSet = new Set(
    soldFromDb.map(
      (n) => `${n.collection.name.toLowerCase()}-${n.indexNumber}`
    )
  );

  /* =========================
     2. GENERATE ITEMS
  ========================= */
  const items = [];
  let currentId = startNumber;

  let attempts = 0;
  const MAX_ATTEMPTS = 200;

  while (
    items.length < limit &&
    currentId <= TOTAL_SIZE &&
    attempts < MAX_ATTEMPTS
  ) {
    attempts++;

    let currentColl =
      collection || (currentId % 2 === 0 ? "smartsnail" : "manchies");

    const data = getNftData(currentId, currentColl);

    if (rarity !== "All" && data.rarity !== rarity) {
      currentId++;
      continue;
    }

    const lookupKey = `${currentColl.toLowerCase()}-${currentId}`;
    const isSold = soldSet.has(lookupKey);

    items.push({
      id: `virtual-${currentColl}-${currentId}`,
      name: `${currentColl === "manchies" ? "Manchie" : "SmartSnail"} #${currentId}`,
      nickname: data.nickname,
      imageUrl: data.image,
      rarity: data.rarity,
      priceShells: data.price,
      priceTon: data.price / 1_000_000,
      priceStars: Math.floor(data.price / 1000),
      collection: { name: currentColl },
      indexNumber: currentId,
      isSold,
    });

    currentId++;
  }

  return NextResponse.json({
    items,
    page,
    total: TOTAL_SIZE,
    hasMore: items.length === limit,
  });
}