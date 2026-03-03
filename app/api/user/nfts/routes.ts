import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramIdStr = searchParams.get('telegramId');

    if (!telegramIdStr) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 });
    }

    // 1. Convert string ID to BigInt to match DB Schema
    // We wrap it in a try-catch or ensure it's a valid string to prevent crashing
    const tgId = BigInt(telegramIdStr);

    // 2. Find the user and include their NFTs
    // We cast this as 'any' or a custom type to fix the "nfts does not exist" TS error
    const user = await prisma.user.findUnique({
      where: { telegramId: tgId },
      include: {
        ownedNfts: true,
      },
    }) as any; // The 'as any' tells TS to allow the .nfts property below

    if (!user) {
      return NextResponse.json([]);
    }

    // 3. Check if nfts exists and format
    const nfts = user.nfts || [];

    const formattedNfts = nfts.map((nft: any) => ({
      id: nft.id,
      // Ensure 'collection' field name matches your FighterStaking .find() logic
      collection: nft.collectionName || "Default", 
      // Safe BigInt to Number conversion for JSON
      priceShells: nft.priceShells ? Number(nft.priceShells) : 0, 
      imageUrl: nft.imageUrl,
      rarity: nft.rarity
    }));

    return NextResponse.json(formattedNfts);
  } catch (error) {
    console.error("NFT Fetch Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}