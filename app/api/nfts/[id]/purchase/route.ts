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
      
      let collectionDoc = await prisma.collection.findFirst({
        where: { name: { equals: collection, mode: 'insensitive' } }
      });

      if (!collectionDoc) {
        collectionDoc = await prisma.collection.create({
          data: { 
            name: collection,
            imageUrl: virtualData.image,
            bannerColor: collection === 'manchies' ? 'red' : 'blue',
            floorPriceShells: BigInt(250000),
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

      nft = existing || await prisma.nft.create({
        data: {
          name: `${collection === 'manchies' ? 'Manchie' : 'SmartSnail'} #${indexNumber}`,
          imageUrl: virtualData.image,
          rarity: virtualData.rarity,
          priceTon: virtualData.price / 1000000,
          priceStars: Math.floor(virtualData.price / 1000),
          priceShells: virtualData.price,   // ← always a number here, never null
          indexNumber: indexNumber,
          collectionId: collectionDoc.id,
          isSold: false,
        }
      });
    } else {
      nft = await prisma.nft.findUnique({ where: { id: params.id } });
    }

    if (!nft) return NextResponse.json({ error: "NFT not found" }, { status: 404 });

    // FIX: Guard against already-sold DB NFTs too (covers the non-virtual path)
    if (nft.isSold) {
      return NextResponse.json({ error: "This NFT has already been sold" }, { status: 400 });
    }

    // 2. Handle SHELLS
    if (method === "shells") {
      const dbUser = await prisma.user.findUnique({
        where: { telegramId: BigInt(tgUser.telegramId) }
      });

      // FIX: Use Number() to safely compare — priceShells from DB NFTs can be null
      const shellPrice = Number(nft.priceShells ?? 0);

      if (!dbUser || Number(dbUser.points) < shellPrice) {
        return NextResponse.json({ error: "Insufficient Shells" }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: dbUser.id },
          data: { points: dbUser.points - BigInt(shellPrice) }
        }),
        prisma.nft.update({
          where: { id: nft.id },
          data: { 
            isSold: true, 
            ownerId: dbUser.id   // ← this was already correct; ensure your schema has this field
          }
        })
      ]);

      return NextResponse.json({ success: true, message: "Purchased with Shells" });
    }

    // 3. Handle STARS
   // 3. Handle STARS
if (method === "stars") {
  console.log(`[STARS] Creating invoice for NFT: ${nft.id}, User: ${tgUser.telegramId}`);

  const invoiceResponse = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // Remove "Authorization"
      body: JSON.stringify({
        title: nft.name,
        description: `Unlock ${nft.rarity} ${nft.name}`,
        // Payload must match what your bot.js expects
        payload: JSON.stringify({ 
          type: "NFT_PURCHASE", // Add a type to distinguish from "Stakes"
          nftId: nft.id, 
          telegramId: tgUser.telegramId 
        }),
        provider_token: "",
        currency: "XTR",
        prices: [{ label: "NFT Purchase", amount: nft.priceStars }]
      })
    }
  );

  const invoiceData = await invoiceResponse.json();
  console.log("[STARS] Telegram Response:", JSON.stringify(invoiceData));

  if (!invoiceData.ok) {
    return NextResponse.json({ error: invoiceData.description }, { status: 400 });
  }
  
  return NextResponse.json({ success: true, invoiceLink: invoiceData.result });
}

    // 4. Handle TON
    if (method === "ton") {
      // FIX: Return success immediately — the frontend will redirect to the TON wallet.
      // We do NOT set isSold here. You need a webhook/callback to confirm TON payment.
      // For now, return the payment info and let the user complete it externally.
      return NextResponse.json({ 
        success: true, 
        address: process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS,
        amount: Math.round(nft.priceTon * 1_000_000_000) // NanoTON must be an integer
      });
    }

    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });

  } catch (error: any) {
    console.error("Purchase API Error:", error);
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 });
  }
}