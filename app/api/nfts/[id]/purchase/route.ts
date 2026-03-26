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
    const method = paymentMethod.toLowerCase();

    // 1. Resolve NFT Data (Virtual or DB)
    let nft;

    if (params.id.startsWith("virtual-")) {
      const virtualData = getNftData(indexNumber, collection);
      
      // Ensure the collection exists in your DB, or create it on the fly
      let collectionDoc = await prisma.collection.findFirst({
        where: { name: { equals: collection, mode: 'insensitive' } }
      });

     if (!collectionDoc) {
        // Safety: Create the collection using your specific Schema requirements
        const virtualData = getNftData(indexNumber, collection);
        
        collectionDoc = await prisma.collection.create({
          data: { 
            name: collection,
            imageUrl: virtualData.image, // Required by your model
            bannerColor: collection === 'manchies' ? 'red' : 'blue', // Match your theme
            floorPriceShells: BigInt(250000), // Required BigInt (note the BigInt wrapper)
          }
        });
      }

      // Check if this index was already sold
      const existing = await prisma.nft.findFirst({
        where: { indexNumber, collectionId: collectionDoc.id }
      });

      if (existing?.isSold) {
        return NextResponse.json({ error: "This unique ID is already taken" }, { status: 400 });
      }

      // Use existing record or create a "Pending" record
      nft = existing || await prisma.nft.create({
        data: {
          name: `${collection === 'manchies' ? 'Manchie' : 'SmartSnail'} #${indexNumber}`,
          imageUrl: virtualData.image,
          rarity: virtualData.rarity,
          priceTon: virtualData.price / 1000000,
          priceStars: Math.floor(virtualData.price / 1000),
          priceShells: virtualData.price,
          indexNumber: indexNumber,
          collectionId: collectionDoc.id,
          isSold: false,
        }
      });
    } else {
      nft = await prisma.nft.findUnique({ where: { id: params.id } });
    }

    if (!nft) return NextResponse.json({ error: "NFT not found" }, { status: 404 });

    // 2. Handle SHELLS
    if (method === "shells") {
      const dbUser = await prisma.user.findUnique({
        where: { telegramId: BigInt(tgUser.telegramId) }
      });

      if (!dbUser || dbUser.points < BigInt(nft.priceShells || 0)) {
        return NextResponse.json({ error: "Insufficient Shells" }, { status: 400 });
      }

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

    // 3. Handle STARS
    if (method === "stars") {
      const invoiceResponse = await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/createInvoiceLink`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: nft.name,
            description: `Unlock ${nft.rarity} ${nft.name}`,
            payload: JSON.stringify({ nftId: nft.id, tgId: tgUser.telegramId }),
            provider_token: "", 
            currency: "XTR",
            prices: [{ label: "NFT Purchase", amount: nft.priceStars }]
          })
        }
      );

      const invoiceData = await invoiceResponse.json();
      if (!invoiceData.ok) throw new Error(invoiceData.description || "Stars API Error");
      
      return NextResponse.json({ success: true, invoiceLink: invoiceData.result });
    }

    // 4. Handle TON
    if (method === "ton") {
      return NextResponse.json({ 
        success: true, 
        address: process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS, // Set this in your .env
        amount: nft.priceTon * 1_000_000_000 // Convert to NanoTON
      });
    }

    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });

  } catch (error: any) {
    console.error("Purchase API Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}