import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: NextRequest) {
    console.log('User API route hit!');
    console.log('Request received');

    try {
        const userData = await req.json();
        console.log('User data received:', userData);

        // Validate the user data
        if (!userData || !userData.id) {
            console.warn('Invalid user data:', userData);
            return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
        }

        // Convert telegramId to string to match the schema
        const telegramId = userData.id.toString();

        // Add connection test
        await prisma.$connect();
        console.log('Database connected successfully');
        
        // Upsert user data in the database
        const user = await prisma.user.upsert({
            where: { 
                telegramId: telegramId  // Use the converted string
            },
            update: {
                email: userData.email || undefined,
                username: userData.username || undefined,
                firstName: userData.first_name || undefined,
                lastName: userData.last_name || undefined,
                updatedAt: new Date(), // Add this to track updates
            },
            create: {
                telegramId: telegramId, // Use the converted string
                username: userData.username || '',
                firstName: userData.first_name || '',
                lastName: userData.last_name || '',
                email: userData.email || '',
                points: 0, // Add default values
                tappingRate: 1,
                nft: false
            },
        });

        console.log('User successfully upserted:', user);
        return NextResponse.json(user);
    } catch (error) {
        console.error('Error processing user data:', error);
        // Add more detailed error information
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Internal server error', details: errorMessage }, 
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}