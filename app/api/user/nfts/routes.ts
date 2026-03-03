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
    ownedNfts: true, // This is what you named the relation in the User model
  },
            }) as any;

            if (!user) return NextResponse.json([]);

            // IMPORTANT: Match the name used in the 'include' above
            const nfts = user.ownedNfts || []; 

            const formattedNfts = nfts.map((nft: any) => ({
            id: nft.id,
            collection: nft.collectionName || "Default", 
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