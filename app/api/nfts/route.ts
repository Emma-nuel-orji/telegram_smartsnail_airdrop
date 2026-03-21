import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNftData } from "@/lib/nftHelpers"; // Make sure this path matches your helper file

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const collection = searchParams.get("collection") || "smartsnail";
  const page = Number(searchParams.get("page") || 1);
  const limit = 20; // Keep it smaller for faster loading in Telegram

  // 1. Fetch ONLY the NFTs that have been bought (isSold: true)
  // We do this to know which indexNumbers are ALREADY TAKEN
  const soldNfts = await prisma.nft.findMany({
    where: { 
      isSold: true,
      collection: { name: collection }
    },
    select: { indexNumber: true }
  });
  
  const soldIndices = new Set(soldNfts.map(n => n.indexNumber));

  // 2. THE VIRTUAL GENERATOR
  // Instead of fetching from DB, we "invent" the items for the current page
  const items = [];
  const startNumber = (page - 1) * limit + 1;
  const TOTAL_COLLECTION_SIZE = 6000;

  for (let i = startNumber; items.length < limit && i <= TOTAL_COLLECTION_SIZE; i++) {
    // If this number is in our "sold" list, skip it (or handle as "Sold")
    if (soldIndices.has(i)) continue; 

    // Get the Nickname, Rarity, and Image from our Brain (Helper)
    const data = getNftData(i, collection);

    items.push({
      id: `virtual-${i}`, // Frontend uses this to know it's not in DB yet
      name: `${collection === 'manchies' ? 'Manchie' : 'SmartSnail'} #${i}`,
      nickname: data.nickname,
      imageUrl: data.image,
      rarity: data.rarity,
      priceShells: data.price,
      priceTon: data.price / 1000000, 
      priceStars: Math.floor(data.price / 1000),
      collection: collection,
      indexNumber: i,
      isSold: false
    });
  }

  // 3. Total is always 6000 for the UI
  const total = TOTAL_COLLECTION_SIZE;

  return NextResponse.json({
    items,
    page,
    total,
    hasMore: startNumber + limit < total,
  });
}