import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: NextRequest) {
    console.log('User API route hit!');

    try {
        const userData = await req.json();
        console.log('User data received:', userData);

        if (!userData || !userData.id) {
            console.warn('Invalid user data:', userData);
            return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
        }

        try {
            // Convert telegram ID to BigInt
            const telegramId = BigInt(userData.id);

            const user = await prisma.user.upsert({
                where: {
                    telegramId
                },
                update: {
                    username: userData.username || undefined,
                    firstName: userData.first_name || undefined,
                    lastName: userData.last_name || undefined,
                    email: userData.email || null,
                    updatedAt: new Date()
                },
                create: {
                    telegramId,
                    username: userData.username || '',
                    firstName: userData.first_name || '',
                    lastName: userData.last_name || '',
                    email: userData.email || null,
                    points: 0,
                    tappingRate: 1,
                    nft: false,
                    hasClaimedWelcome: false,
                    tasks: {
                        create: []
                    },
                    referrals: {
                        create: []
                    },
                    referredBy: {
                        create: []
                    },
                    purchases: {
                        create: []
                    },
                    completedTasks: {
                        create: []
                    }
                }
            });

            // Convert BigInt to string for JSON response
            const serializedUser = {
                ...user,
                telegramId: user.telegramId.toString(),
                id: user.id.toString()
            };

            console.log('User successfully upserted:', serializedUser);
            return NextResponse.json(serializedUser);

        } catch (conversionError) {
            console.error('Error converting telegramId:', conversionError);
            return NextResponse.json(
                { error: 'Invalid telegram ID format' },
                { status: 400 }
            );
        }

    } catch (error) {
        console.error('Error processing user data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Internal server error', details: errorMessage },
            { status: 500 }
        );
    }
}