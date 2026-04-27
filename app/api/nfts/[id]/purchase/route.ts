import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelegramUser } from "@/lib/auth";
import { getNftData } from "@/lib/nftHelpers";

export async function POST(req: Request) {
  try {
    /* =========================
       1. AUTH (STANDARDIZED)
    ========================= */
    const authResult = await authenticateTelegramUser(req as any);

    if (!authResult.isAuthenticated || !authResult.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const telegramId = authResult.telegramId;

    /* =========================
       2. INPUT
    ========================= */
    const { paymentMethod, indexNumber, collection } = await req.json();

    if (!paymentMethod || indexNumber === undefined || !collection) {
      return NextResponse.json(
        { error: "Missing fields" },
        { status: 400 }
      );
    }

    const method = paymentMethod.toLowerCase();

    /* =========================
       3. NFT RESOLUTION
    ========================= */
    let nft: any;

    const paramsId = (req as any).params?.id;

    if (paramsId?.startsWith("virtual-")) {
      const virtualData = getNftData(indexNumber, collection);

      let collectionDoc = await prisma.collection.findFirst({
        where: {
          name: { equals: collection, mode: "insensitive" },
        },
      });

      if (!collectionDoc) {
        collectionDoc = await prisma.collection.create({
          data: {
            name: collection,
            imageUrl: virtualData.image,
            bannerColor: collection === "manchies" ? "red" : "blue",
            floorPriceShells: BigInt(250000),
          },
        });
      }

      // ✅ FIXED: use findFirst (NOT findUnique composite)
      const existing = await prisma.nft.findFirst({
        where: {
          indexNumber,
          collectionId: collectionDoc.id,
        },
      });

      if (existing?.isSold) {
        return NextResponse.json(
          { error: "This NFT is already sold" },
          { status: 400 }
        );
      }

      nft =
        existing ||
        (await prisma.nft.create({
          data: {
            name: `${collection === "manchies" ? "Manchie" : "SmartSnail"} #${indexNumber}`,
            imageUrl: virtualData.image,
            rarity: virtualData.rarity,
            priceTon: virtualData.price / 1_000_000,
            priceStars: Math.floor(virtualData.price / 1000),
            priceShells: virtualData.price,
            indexNumber,
            collectionId: collectionDoc.id,
            isSold: false,
          },
        }));
    } else {
      nft = await prisma.nft.findUnique({
        where: { id: paramsId },
      });
    }

    if (!nft) {
      return NextResponse.json(
        { error: "NFT not found" },
        { status: 404 }
      );
    }

    if (nft.isSold) {
      return NextResponse.json(
        { error: "Already sold" },
        { status: 400 }
      );
    }

    /* =========================
       4. SHELLS PAYMENT
    ========================= */
    if (method === "shells") {
      const dbUser = await prisma.user.findUnique({
        where: { telegramId },
      });

      const shellPrice = Number(nft.priceShells ?? 0);

      if (!dbUser || Number(dbUser.points) < shellPrice) {
        return NextResponse.json(
          { error: "Insufficient Shells" },
          { status: 400 }
        );
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: dbUser.id },
          data: {
            points: {
              decrement: BigInt(shellPrice),
            },
          },
        }),
        prisma.nft.update({
          where: { id: nft.id },
          data: {
            isSold: true,
            ownerId: dbUser.id,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Purchased with Shells",
      });
    }

    /* =========================
       5. STARS PAYMENT
    ========================= */
    if (method === "stars") {
      const invoiceResponse = await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/createInvoiceLink`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: nft.name,
            description: `Unlock ${nft.rarity} ${nft.name}`,
            payload: JSON.stringify({
              type: "NFT_PURCHASE",
              nftId: nft.id,
              telegramId: telegramId.toString(),
            }),
            provider_token: "",
            currency: "XTR",
            prices: [
              {
                label: "NFT Purchase",
                amount: nft.priceStars,
              },
            ],
          }),
        }
      );

      const data = await invoiceResponse.json();

      if (!data.ok) {
        return NextResponse.json(
          { error: data.description },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        invoiceLink: data.result,
      });
    }

    /* =========================
       6. TON
    ========================= */
    if (method === "ton") {
      return NextResponse.json({
        success: true,
        address:
          process.env.NEXT_PUBLIC_TESTNET_TON_WALLET_ADDRESS,
        amount: Math.round(nft.priceTon * 1_000_000_000),
      });
    }

    return NextResponse.json(
      { error: "Invalid payment method" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Purchase API Error:", error);
    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}