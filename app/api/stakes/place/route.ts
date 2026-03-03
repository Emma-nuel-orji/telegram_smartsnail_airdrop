import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { getWebAppUser } from '@/lib/storage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fightId, fighterId, stakeAmount, stakeType } = body;

    if (!fightId || !fighterId || !stakeAmount || !stakeType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ✅ FIXED: Defining telegramUser correctly
    const telegramUser = await getWebAppUser();
    if (!telegramUser || !telegramUser.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // ✅ FIXED: Defining stakeAmountBI before the transaction
    const stakeAmountBI = BigInt(stakeAmount);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegramId: BigInt(telegramUser.id) },
      });
      const fight = await tx.fight.findUnique({ where: { id: fightId } });
      const selectedFighter = await tx.fighter.findUnique({ where: { id: fighterId } });

      if (!user || !fight || !selectedFighter) throw new Error('Data not found');
      
      // ✅ FIXED: Changed "STARTING" to your actual enum "SCHEDULED" 
      // Ensure this matches your FightStatus enum (e.g., SCHEDULED, ONGOING, CONCLUDED)
      if (fight.status !== 'SCHEDULED') throw new Error('Fight is not accepting stakes');

      const existing = await tx.stake.findFirst({
        where: { userId: user.id, fightId }
      });
      if (existing) throw new Error('Already staked on this fight');

      const userNft = await tx.nft.findFirst({
        where: { ownerId: user.id, collectionId: selectedFighter.collectionId || undefined }
      });

      // 🚨 NFT LOCK CHECK
      if (userNft) {
        const nftBusy = await tx.stake.findFirst({
          where: {
            nftId: userNft.id,
            status: 'COMPLETED',
            fight: {
              // Lock NFT if the fight is still SCHEDULED
              status: 'SCHEDULED' 
            }
          }
        });
        if (nftBusy) throw new Error('This NFT is already locked in another fight');
      }

      const nftPower = BigInt(userNft?.priceShells || 0);
      const totalStakingPower = user.points + nftPower;

      if (totalStakingPower < 200000n && !userNft) throw new Error('Min 200k power required');
      if (stakeAmountBI > totalStakingPower) throw new Error('Insufficient power');

      // Commissions
      const managerCut = (stakeAmountBI * 50n) / 100n;
      const fighterCut = (stakeAmountBI * 30n) / 100n;

      if (selectedFighter.ownerId) {
        await tx.user.update({
          where: { id: selectedFighter.ownerId },
          data: { points: { increment: managerCut } }
        });
      }
      if (selectedFighter.userTelegramId) {
        await tx.user.update({
          where: { telegramId: selectedFighter.userTelegramId },
          data: { points: { increment: fighterCut } }
        });
      }

      // Point Deduction Logic
      const amountToDeduct = stakeAmountBI > user.points ? user.points : stakeAmountBI;
      
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { points: { decrement: amountToDeduct } }
      });

      if (updatedUser.points < 0n) throw new Error('Insufficient balance');

      return await tx.stake.create({
        data: {
          userId: user.id,
          fightId,
          fighterId,
          nftId: userNft?.id || null, // Store reference for the lock
          stakeAmount: stakeAmountBI,
          stakeType: 'POINTS',
          status: 'COMPLETED',
          initialStakeAmount: stakeAmountBI
        }
      });
    });

    return NextResponse.json({
      message: 'Stake placed successfully',
      stake: {
        ...result,
        stakeAmount: result.stakeAmount.toString(),
        initialStakeAmount: result.initialStakeAmount.toString()
      }
    });

  } catch (error: any) {
    console.error('Stake Error:', error.message);
    return NextResponse.json({ error: error.message || 'Failed to place stake' }, { status: 400 });
  }
}