import { NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';
import { getWebAppUser } from '@/lib/storage';
import { StakeStatus } from '@prisma/client';
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fightId, fighterId, stakeAmount, stakeType } = body;

    if (!fightId || !fighterId || !stakeAmount || !stakeType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const telegramUser = await getWebAppUser();
    if (!telegramUser || !telegramUser.id) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const stakeAmountBI = BigInt(stakeAmount);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch data within the transaction using 'tx'
      const user = await tx.user.findUnique({
        where: { telegramId: BigInt(telegramUser.id) },
      });
      
      const fight = await tx.fight.findUnique({ where: { id: fightId } });

      // 🚨 NULL CHECK (Moved up to satisfy TypeScript)
      if (!user || !fight) {
        throw new Error('User or Fight data not found');
      }

      // 2. Time Guard with Buffer (Now safe because fight is guaranteed to exist)
      const isExpired = Date.now() >= (new Date(fight.fightDate).getTime() - (5 * 60 * 1000));
      if (isExpired || fight.status !== 'SCHEDULED') {
          throw new Error('Staking is no longer available for this fight');
      }

      const selectedFighter = await tx.fighter.findUnique({ where: { id: fighterId } });
      if (!selectedFighter) throw new Error('Selected fighter not found');

      // 3. Existing Stake Check
      const existing = await tx.stake.findFirst({
        where: { userId: user.id, fightId }
      });
      // if (existing) throw new Error('Already staked on this fight');

      // 4. NFT Check & Lock
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

      // 5. Power Calculation
      const nftPower = BigInt(userNft?.priceShells || 0);
      const totalStakingPower = user.points + nftPower;

      if (totalStakingPower < 200000n && !userNft) throw new Error('Min 200k power required');
      if (stakeAmountBI > totalStakingPower) throw new Error('Insufficient power');

      // 6. Commissions (The part that needs the CLAWBACK in your bot script later)
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

      // 7. Point Deduction
      const amountToDeduct = stakeAmountBI > user.points ? user.points : stakeAmountBI;
      
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { points: { decrement: amountToDeduct } }
      });

      if (updatedUser.points < 0n) throw new Error('Insufficient balance');

      // 8. Create Stake
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