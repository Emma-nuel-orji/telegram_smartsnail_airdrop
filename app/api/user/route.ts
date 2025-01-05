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

        let telegramId: bigint;
        try {
            telegramId = BigInt(userData.id);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown conversion error';
            return NextResponse.json(
                { error: 'Invalid telegram ID format', details: errorMessage },
                { status: 400 }
            );
        }

        try {
            let user = await prisma.user.findUnique({
                where: { telegramId }
            });

            if (user) {
                // Update the user if it already exists
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        username: userData.username || undefined,
                        firstName: userData.first_name || undefined,
                        lastName: userData.last_name || undefined,
                        updatedAt: new Date(),
                        ...(userData.email && { email: userData.email }) // Only include `email` if provided
                    }
                });
            } else {
                // Create a new user if it does not exist
                const createData = {
                    telegramId,
                    username: userData.username || '',
                    firstName: userData.first_name || '',
                    lastName: userData.last_name || '',
                    points: 0,
                    tappingRate: 1,
                    nft: false,
                    hasClaimedWelcome: false,
                    ...(userData.email && { email: userData.email }) // Only include `email` if provided
                };

                user = await prisma.user.create({ data: createData });
            }

            // Serialize the response to include `telegramId` and `id` as strings
            const serializedUser = {
                ...user,
                telegramId: user.telegramId.toString(),
                id: user.id.toString()
            };

            console.log('User successfully processed:', serializedUser);
            return NextResponse.json(serializedUser);

        } catch (err) {
            // Handle Prisma errors specifically
            if (
                err &&
                typeof err === 'object' &&
                'code' in err &&
                'message' in err &&
                'meta' in err
            ) {
                console.error('Database error:', {
                    code: err.code,
                    message: err.message,
                    meta: err.meta
                });
                return NextResponse.json(
                    { 
                        error: 'Database operation failed', 
                        details: `${String(err.code)}: ${String(err.message)}`,
                        meta: err.meta
                    },
                    { status: 500 }
                );
            }
            throw err;
        }

    } catch (err) {
        console.error('Error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Internal server error', details: errorMessage },
            { status: 500 }
        );
    }
}
