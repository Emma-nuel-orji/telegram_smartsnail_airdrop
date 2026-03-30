import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { StakeStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fightId, fighterId, stakeAmount, stakeType, telegramId } = body;

    if (!fightId || !fighterId || !stakeAmount || !stakeType || !telegramId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const stakeAmountBI = BigInt(stakeAmount);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegramId: BigInt(telegramId) }, // 👈 FIXED: was telegramUser.id
      });
      
      const fight = await tx.fight.findUnique({ where: { id: fightId } });

      if (!user || !fight) {
        throw new Error('User or Fight data not found');
      }

      const isExpired = Date.now() >= (new Date(fight.fightDate).getTime() - (5 * 60 * 1000));
      if (isExpired || fight.status !== 'SCHEDULED') {
        throw new Error('Staking is no longer available for this fight');
      }

      const selectedFighter = await tx.fighter.findUnique({ where: { id: fighterId } });
      if (!selectedFighter) throw new Error('Selected fighter not found');

      const existing = await tx.stake.findFirst({
        where: { userId: user.id, fightId }
      });

      const userNft = await tx.nft.findFirst({
        where: { ownerId: user.id, collectionId: selectedFighter.collectionId || undefined }
      });

      if (userNft) {
        const nftBusy = await tx.stake.findFirst({
          where: {
            nftId: userNft.id,
            status: StakeStatus.PENDING,
            fight: { status: 'SCHEDULED' }
          }
        });
        if (nftBusy) throw new Error('This NFT is already locked in another fight');
      }

      const nftPower = BigInt(userNft?.priceShells || 0);
      const totalStakingPower = user.points + nftPower;

      if (totalStakingPower < 200000n && !userNft) throw new Error('Min 200k power required');
      if (stakeAmountBI > totalStakingPower) throw new Error('Insufficient power');

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
          nftId: userNft?.id || null,
          stakeAmount: stakeAmountBI,
          stakeType: 'POINTS',
          status: StakeStatus.PENDING,
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