// app/api/nfts/[id]/purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TODO: Replace with real Telegram auth
async function getTelegramUser(req: NextRequest) {
  const telegramId = req.headers.get('x-telegram-user-id');
  if (telegramId) return { telegramId };

  // Fallback for development
  return { telegramId: "123456" };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { paymentMethod } = await req.json();
    const user = await getTelegramUser(req);

    // Only allow TON or Telegram Stars
    if (!["ton", "stars"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method. Only TON or Stars allowed." },
        { status: 400 }
      );
    }

    // Find NFT
    const nft = await prisma.nft.findUnique({
      where: { id: params.id },
    });

    if (!nft) {
      return NextResponse.json({ error: "NFT not found" }, { status: 404 });
    }

    if (nft.isSold) {
      return NextResponse.json(
        { error: "NFT already sold" },
        { status: 400 }
      );
    }

    // Handle Telegram Stars
    if (paymentMethod === "stars") {
      // Create Telegram Stars invoice
      const invoiceResponse = await fetch(
        `https://api.telegram.org/bot${process.env.BOT_TOKEN}/createInvoiceLink`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: nft.name,
            description: `Purchase ${nft.name} NFT`,
            payload: JSON.stringify({
              type: "nft_purchase",
              nftId: nft.id,
              telegramId: user.telegramId
            }),
            currency: "XTR",
            prices: [{ label: nft.name, amount: nft.priceStars }]
          })
        }
      );

      const invoiceData = await invoiceResponse.json();

      if (!invoiceResponse.ok || !invoiceData.ok) {
        return NextResponse.json(
          { error: "Failed to create invoice" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        invoiceLink: invoiceData.result
      });
    }

    // Handle TON
    if (paymentMethod === "ton") {
      // TODO: Integrate real TON payment here
      return NextResponse.json(
        { success: true, message: "TON payment processing not implemented yet" }
      );
    }

    // Safety fallback
    return NextResponse.json(
      { error: "Unknown error" },
      { status: 500 }
    );

  } catch (error) {
    console.error("Purchase error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
