import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function POST(req: NextRequest) {
    console.log('User API route hit!');
    console.log('Request received'); // Log when the route is accessed

    try {
        const userData = await req.json();
        console.log('User data received:', userData); // Log received user data

        // Validate the user data
        if (!userData || !userData.id) {
            console.warn('Invalid user data:', userData); // Log invalid data
            return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
        }

        // Upsert user data in the database
        const user = await prisma.user.upsert({
            where: { telegramId: userData.id },
            update: {
                email: userData.email || undefined, // Update email only if provided
                username: userData.username || undefined,
                firstName: userData.first_name || undefined,
                lastName: userData.last_name || undefined,
            },
            create: {
                telegramId: userData.id,
                username: userData.username || '',
                firstName: userData.first_name || '',
                lastName: userData.last_name || '',
                email: userData.email || '', // Create with email if provided
            },
        });

        console.log('User successfully upserted:', user); // Log success
        return NextResponse.json(user);
    } catch (error) {
        console.error('Error processing user data:', error); // Log any errors
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
