import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNftData } from "@/lib/nftHelpers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const collection = searchParams.get("collection"); // Can be null
  const rarity = searchParams.get("rarity") || "All";
  const page = Number(searchParams.get("page") || 1);
  const limit = 20;

  let startNumber = (page - 1) * limit + 1;

  // Jump Logic
  if (collection === 'smartsnail' && rarity !== "All") {
    if (rarity === 'Epic') startNumber += 600;
    if (rarity === 'Rare') startNumber += 1350;
    if (rarity === 'Uncommon') startNumber += 2500;
    if (rarity === 'Common') startNumber += 4000;
  }

  // FIX: Only add the collection filter if it's not null
  const whereClause: any = { isSold: true };
  if (collection) {
    whereClause.collection = { name: collection };
  }

  const soldNfts = await prisma.nft.findMany({
    where: whereClause,
    select: { indexNumber: true, collection: { select: { name: true } } }
  });
  
  // Create a Set of "CollectionName-Index" so we don't skip the wrong one
  const soldSet = new Set(soldNfts.map(n => `${n.collection.name}-${n.indexNumber}`));

  const items = [];
  const TOTAL_SIZE = 6000;

  // We use a separate counter for the loop to ensure we get exactly 20 items
  let currentId = startNumber;

  while (items.length < limit && currentId <= TOTAL_SIZE) {
    // 1. Determine Collection: If null, alternate. If specified, use that.
    let currentColl = collection;
    if (!collection) {
      // Alternate: Even IDs are Snails, Odd IDs are Manchies
      currentColl = currentId % 2 === 0 ? "smartsnail" : "manchies";
    }

    // 2. Check if this specific combo is sold
    if (soldSet.has(`${currentColl}-${currentId}`)) {
      currentId++;
      continue;
    }

    // 3. Get the data from helper
    const data = getNftData(currentId, currentColl!);

    // 4. Rarity Filter Check
    // If user is looking for "Common", and we picked a Manchie (which is Legendary), 
    // we must skip this iteration and try the next ID.
    if (rarity !== "All" && data.rarity !== rarity) {
      currentId++;
      // Optimization: If filtering Snails and we passed the rarity range, stop.
      if (collection === 'smartsnail') {
         if (rarity === 'Legendary' && currentId > 600) break;
      }
      continue;
    }

    // 5. Build the Object
    items.push({
      id: `virtual-${currentColl}-${currentId}`,
      name: `${currentColl === 'manchies' ? 'Manchie' : 'SmartSnail'} #${currentId}`,
      nickname: data.nickname,
      imageUrl: data.image,
      rarity: data.rarity,
      priceShells: data.price,
      priceTon: data.price / 1000000, 
      priceStars: Math.floor(data.price / 1000),
      collection: currentColl,
      indexNumber: currentId,
      isSold: false
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