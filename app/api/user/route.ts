import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: NextRequest) {
    console.log('User API route hit!'); // Logs when the route is hit

    try {
        const userData = await req.json(); // Parse the incoming request body
        console.log('User data received:', userData); // Logs the parsed user data

        // Validate that userData contains the necessary fields
        if (!userData || !userData.id) {
            console.warn('Invalid or missing user data:', userData);
            return NextResponse.json({ error: 'Invalid or missing user data' }, { status: 400 });
        }

        // Convert telegramId to BigInt and handle conversion errors
        let telegramId: bigint;
        try {
            telegramId = BigInt(userData.id);
        } catch (err) {
            console.error('Failed to convert telegram ID to BigInt:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown conversion error';
            return NextResponse.json(
                { error: 'Invalid telegram ID format', details: errorMessage },
                { status: 400 }
            );
        }

        // Attempt to find the user in the database
        try {
            let user = await prisma.user.findUnique({
                where: { telegramId } // Use the converted BigInt here
            });

            console.log('Database query result for user:', user); // Logs the query result

            if (user) {
                // Update the user if they already exist
                console.log('User exists, updating user data...');
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
                console.log('User updated successfully:', user);
            } else {
                // Create a new user if they do not exist
                console.log('User not found, creating new user...');
                const createData = {
                    telegramId, // Use the BigInt here
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
                console.log('User created successfully:', user);
            }

            // Serialize the response to include `telegramId` and `id` as strings
            const serializedUser = {
                ...user,
                telegramId: user.telegramId.toString(),
                id: user.id.toString()
            };

            console.log('Final serialized user data:', serializedUser); // Logs the serialized user data
            return NextResponse.json(serializedUser);

        } catch (err: any) {
            // Handle Prisma-specific errors
            if ('code' in err && 'message' in err && 'meta' in err) {
                console.error('Prisma error during database operation:', {
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
            throw err; // Re-throw unexpected errors
        }

    } catch (err: any) {
        // Handle unexpected errors
        console.error('Unexpected error during user processing:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Internal server error', details: errorMessage },
            { status: 500 }
        );
    }
}
