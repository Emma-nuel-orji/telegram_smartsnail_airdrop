import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: NextRequest) {
    console.log('User API route hit!'); // Logs when the route is hit

    try {
        const userData = await req.json(); // Parse the incoming request body
        console.log('User data received:', userData); // Logs the parsed user data

        // Validate that userData contains the necessary fields
        if (!userData || !userData.telegramId) {
            console.warn('Invalid or missing user data:', userData);
            return NextResponse.json({ error: 'Invalid or missing user data' }, { status: 400 });
        }

        // Convert telegramId to BigInt and handle conversion errors
        let telegramId: bigint;
        try {
            telegramId = BigInt(userData.telegramId); // Use telegramId from the request
        } catch (err) {
            console.error('Failed to convert telegram ID to BigInt:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown conversion error';
            return NextResponse.json(
                { error: 'Invalid telegram ID format', details: errorMessage },
                { status: 400 }
            );
        }

        // Check if the user already exists
        let user = await prisma.user.findUnique({
            where: { telegramId }, // Use the converted BigInt here
        });

        if (user) {
            // If user exists, update their data
            console.log('User exists, updating user data...');
            user = await prisma.user.update({
                where: { id: user.id },
                data: {
                    username: userData.username || undefined,
                    firstName: userData.firstName || undefined,
                    lastName: userData.lastName || undefined,
                    updatedAt: new Date(),
                    ...(userData.email && { email: userData.email }) // Include `email` only if provided
                }
            });
            console.log('User updated successfully:', user);
        } else {
            // If user doesn't exist, create a new user
            console.log('User not found, creating new user...');
            const createData = {
                telegramId, // Use the BigInt here
                username: userData.username || '',
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                points: userData.points || 0, // Default to 0 if points are not provided
                tappingRate: userData.tappingRate || 1, // Default to 1 if tappingRate is not provided
                hasClaimedWelcome: userData.hasClaimedWelcome || false, // Default to false if not provided
                nft: userData.nft || false, // Default to false if not provided
                ...(userData.email && { email: userData.email }) // Include email only if provided
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
        console.error('Unexpected error during user processing:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Internal server error', details: errorMessage },
            { status: 500 }
        );
    }
}
