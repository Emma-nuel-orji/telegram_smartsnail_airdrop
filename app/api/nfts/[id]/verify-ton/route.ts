import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelegramUser } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    /* =========================
       1. STANDARD AUTH
    ========================= */
    const auth = await authenticateTelegramUser(req);

    if (!auth.isAuthenticated || !auth.telegramId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const telegramId = auth.telegramId;

    /* =========================
       2. INPUT (ONLY boc)
    ========================= */
    const { boc } = await req.json();

    if (!boc) {
      return NextResponse.json(
        { error: "Missing BOC" },
        { status: 400 }
      );
    }

    /* =========================
       3. FIND USER
    ========================= */
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    /* =========================
       4. VERIFY ON-CHAIN (TODO)
    ========================= */
    // IMPORTANT: Replace this with TON indexer check later
    // Example: check transaction exists + matches nftId + sender wallet

    console.log("BOC received:", boc);

    /* =========================
       5. UPDATE NFT OWNERSHIP
    ========================= */
    await prisma.nft.update({
      where: { id: params.id },
      data: {
        isSold: true,
        ownerId: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("TON Verify Error:", error);

    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}