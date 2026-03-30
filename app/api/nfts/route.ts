export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNftData } from "@/lib/nftHelpers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const collection = searchParams.get("collection");
  const rarity = searchParams.get("rarity") || "All";
  const page = Number(searchParams.get("page") || 1);
  const limit = 20;

  let startNumber = (page - 1) * limit + 1;

  if (collection === 'smartsnail' && rarity !== "All") {
    if (rarity === 'Epic') startNumber += 600;
    if (rarity === 'Rare') startNumber += 1350;
    if (rarity === 'Uncommon') startNumber += 2500;
    if (rarity === 'Common') startNumber += 4000;
  }

  const whereClause: any = { isSold: true };
  if (collection) {
    whereClause.collection = { 
      name: { equals: collection, mode: 'insensitive' } // 👈 FIXED
    };
  }

  const soldNfts = await prisma.nft.findMany({
    where: whereClause,
    select: { indexNumber: true, collection: { select: { name: true } } }
  });
  
  console.log("Sold NFTs from DB:", soldNfts);

  const soldSet = new Set(
    soldNfts.map(n => `${n.collection.name.toLowerCase()}-${n.indexNumber}`)
  );

  console.log("soldSet:", [...soldSet]);

  const items = [];
  const TOTAL_SIZE = 6000;
  let currentId = startNumber;

  while (items.length < limit && currentId <= TOTAL_SIZE) {
    let currentColl = collection || (currentId % 2 === 0 ? "smartsnail" : "manchies");

    const data = getNftData(currentId, currentColl!);

    if (rarity !== "All" && data.rarity !== rarity) {
      currentId++;
      continue;
    }

    const isActuallySold = soldSet.has(`${currentColl!.toLowerCase()}-${currentId}`);

    items.push({
      id: `virtual-${currentColl}-${currentId}`,
      name: `${currentColl === 'manchies' ? 'Manchie' : 'SmartSnail'} #${currentId}`,
      nickname: data.nickname,
      imageUrl: data.image,
      rarity: data.rarity,
      priceShells: data.price,
      priceTon: data.price / 1000000, 
      priceStars: Math.floor(data.price / 1000),
      collection: { name: currentColl },
      indexNumber: currentId,
      isSold: isActuallySold
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