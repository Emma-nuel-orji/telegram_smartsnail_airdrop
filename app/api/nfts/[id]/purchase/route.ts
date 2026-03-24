// app/api/nfts/[id]/purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNftData } from "@/lib/nftHelpers";

async function getTelegramUser(req: NextRequest) {
  const telegramId = req.headers.get('x-telegram-user-id');
  return { telegramId: telegramId || "123456" };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { paymentMethod, indexNumber, collection } = await req.json();
    const tgUser = await getTelegramUser(req);

    // 1. Find or "Create" the NFT Data
    let nft;

    if (params.id.startsWith("virtual-")) {
      // It's a virtual NFT - Get data from our helper
      const virtualData = getNftData(indexNumber, collection);
      
      // Check if this specific index was already converted/sold by someone else
      const existing = await prisma.nft.findFirst({
        where: { indexNumber, collection: { name: collection } }
      });

      if (existing?.isSold) {
        return NextResponse.json({ error: "This unique ID is already taken" }, { status: 400 });
      }

      // Find the Collection ID (Requirement for your Schema)
      const collectionDoc = await prisma.collection.findFirst({
        where: { name: { equals: collection, mode: 'insensitive' } }
      });

      if (!collectionDoc) {
        return NextResponse.json({ error: "Collection not found in database" }, { status: 500 });
      }

      // Convert Virtual to a DB record (isSold: false until payment confirms)
      // Or you can create it only after payment success - usually better to create a 'Pending' record
      nft = await prisma.nft.create({
        data: {
          name: `${collection === 'manchies' ? 'Manchie' : 'SmartSnail'} #${indexNumber}`,
          imageUrl: virtualData.image,
          rarity: virtualData.rarity,
          priceTon: virtualData.price / 1000000,
          priceStars: Math.floor(virtualData.price / 1000),
          priceShells: virtualData.price,
          indexNumber: indexNumber,
          collectionId: collectionDoc.id,
          isSold: false, // Will be set to true by your Webhook/Payment handler
        }
      });
    } else {
      // Standard DB lookup
      nft = await prisma.nft.findUnique({ where: { id: params.id } });
    }

    if (!nft) return NextResponse.json({ error: "NFT not found" }, { status: 404 });

    // 2. Handle Shells (Internal Currency)
    if (paymentMethod === "shells") {
      const dbUser = await prisma.user.findUnique({
        where: { telegramId: BigInt(tgUser.telegramId) }
      });

      if (!dbUser || dbUser.points < BigInt(nft.priceShells || 0)) {
        return NextResponse.json({ error: "Insufficient Shells" }, { status: 400 });
      }

      // Execute atomic transaction: Pay + Transfer Ownership
      await prisma.$transaction([
        prisma.user.update({
          where: { id: dbUser.id },
          data: { points: dbUser.points - BigInt(nft.priceShells || 0) }
        }),
        prisma.nft.update({
          where: { id: nft.id },
          data: { isSold: true, ownerId: dbUser.id }
        })
      ]);

      return NextResponse.json({ success: true, message: "Purchased with Shells" });
    }

    // 3. Handle Stars (External Payment)
    if (paymentMethod === "stars") {
      const invoiceResponse = await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/createInvoiceLink`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: nft.name,
            description: `Unlock ${nft.rarity} ${nft.name}`,
            payload: JSON.stringify({ nftId: nft.id, tgId: tgUser.telegramId }),
            provider_token: "", // Empty for Digital Goods/Stars
            currency: "XTR",
            prices: [{ label: "NFT Purchase", amount: nft.priceStars }]
          })
        }
      );

      const invoiceData = await invoiceResponse.json();
      return NextResponse.json({ success: true, invoiceLink: invoiceData.result });
    }

    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}