import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelegramUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateTelegramUser(req);
    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { boc } = await req.json();
    const nftId = params.id;

    const user = await prisma.user.findUnique({
      where: { telegramId: auth.telegramId },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    /* =========================
       FIX: Resolve Real NFT ID
    ========================= */
    let realNftId = nftId;

    if (nftId.startsWith("virtual-")) {
      // If it's virtual, we need to find the record we created in the /purchase route
      // Format is "virtual-collection-index"
      const parts = nftId.split("-");
      const collectionName = parts[1];
      const indexNumber = parseInt(parts[2]);

      const existingNft = await prisma.nft.findFirst({
        where: {
          indexNumber: indexNumber,
          collection: { name: { equals: collectionName, mode: "insensitive" } }
        }
      });

      if (!existingNft) {
        return NextResponse.json({ error: "NFT record not found" }, { status: 404 });
      }
      
      realNftId = existingNft.id; // Get the actual MongoDB ObjectId
    }

    /* =========================
       UPDATE NFT OWNERSHIP
    ========================= */
    await prisma.nft.update({
      where: { id: realNftId }, // Now using the real hex ID
      data: {
        isSold: true,
        ownerId: user.id,
      },
    });

    console.log(`✅ NFT ${realNftId} successfully sold to user ${user.id}`);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("TON Verify Error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}