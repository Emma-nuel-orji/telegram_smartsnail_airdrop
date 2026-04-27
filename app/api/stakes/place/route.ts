import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateTelegramUser } from "@/lib/auth";
import { StakeStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    /* =========================
       1. AUTH (STANDARDIZED)
    ========================= */
    const auth = await authenticateTelegramUser(req);

    if (!auth.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const telegramId = auth.telegramId;

    /* =========================
       2. INPUT
    ========================= */
    const body = await req.json();
    const { fightId, fighterId, stakeAmount, stakeType } = body;

    if (!fightId || !fighterId || !stakeAmount || !stakeType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const stakeAmountBI = BigInt(stakeAmount);

    /* =========================
       3. TRANSACTION
    ========================= */
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegramId },
      });

      const fight = await tx.fight.findUnique({
        where: { id: fightId },
      });

      if (!user || !fight) {
        throw new Error("User or Fight data not found");
      }

      /* =========================
         4. FIGHT VALIDATION
      ========================= */
      const isExpired =
        Date.now() >=
        new Date(fight.fightDate).getTime() - 5 * 60 * 1000;

      if (isExpired || fight.status !== "SCHEDULED") {
        throw new Error("Staking is no longer available for this fight");
      }

      /* =========================
         5. FIGHTER CHECK
      ========================= */
      const selectedFighter = await tx.fighter.findUnique({
        where: { id: fighterId },
      });

      if (!selectedFighter) {
        throw new Error("Selected fighter not found");
      }

      /* =========================
         6. NFT LOCK CHECK
      ========================= */
      const userNft = await tx.nft.findFirst({
        where: {
          ownerId: user.id,
          collectionId: selectedFighter.collectionId || undefined,
        },
      });

      if (userNft) {
        const nftBusy = await tx.stake.findFirst({
          where: {
            nftId: userNft.id,
            status: StakeStatus.PENDING,
            fight: { status: "SCHEDULED" },
          },
        });

        if (nftBusy) {
          throw new Error("This NFT is already locked in another fight");
        }
      }

      /* =========================
         7. POWER CALCULATION
      ========================= */
      const nftPower = BigInt(userNft?.priceShells || 0);
      const totalPower = user.points + nftPower;

      if (totalPower < 200000n && !userNft) {
        throw new Error("Min 200k power required");
      }

      if (stakeAmountBI > totalPower) {
        throw new Error("Insufficient power");
      }

      /* =========================
         8. REWARD DISTRIBUTION
      ========================= */
      const managerCut = (stakeAmountBI * 50n) / 100n;
      const fighterCut = (stakeAmountBI * 30n) / 100n;

      if (selectedFighter.ownerId) {
        await tx.user.update({
          where: { id: selectedFighter.ownerId },
          data: { points: { increment: managerCut } },
        });
      }

      if (selectedFighter.userTelegramId) {
        await tx.user.update({
          where: { telegramId: selectedFighter.userTelegramId },
          data: { points: { increment: fighterCut } },
        });
      }

      /* =========================
         9. DEDUCT USER BALANCE (SAFE)
      ========================= */
      if (user.points < stakeAmountBI) {
        throw new Error("Insufficient balance");
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          points: { decrement: stakeAmountBI },
        },
      });

      /* =========================
         10. CREATE STAKE
      ========================= */
      return await tx.stake.create({
        data: {
          userId: user.id,
          fightId,
          fighterId,
          nftId: userNft?.id || null,
          stakeAmount: stakeAmountBI,
          stakeType: "POINTS",
          status: StakeStatus.PENDING,
          initialStakeAmount: stakeAmountBI,
        },
      });
    });

    /* =========================
       11. RESPONSE
    ========================= */
    return NextResponse.json({
      message: "Stake placed successfully",
      stake: {
        ...result,
        stakeAmount: result.stakeAmount.toString(),
        initialStakeAmount: result.initialStakeAmount.toString(),
      },
    });
  } catch (error: any) {
    console.error("Stake Error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to place stake" },
      { status: 400 }
    );
  }
}