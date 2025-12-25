// app/api/fighter/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const REGISTRATION_COST_STARS = 500;
const REGISTRATION_COST_SHELLS = 1000000;

// Telegram notification config
const ADMIN_NOTIFICATION_GROUP_ID = process.env.ADMIN_GROUP_CHAT_ID; // e.g., "-1001234567890"
const BOT_TOKEN = process.env.BOT_TOKEN;

async function sendTelegramNotification(fighterData: any) {
  try {
    const message = `
🥊 **NEW FIGHTER REGISTRATION** 🥊

👤 **Name:** ${fighterData.name}
📅 **Age:** ${fighterData.age}
⚧️ **Gender:** ${fighterData.gender}
📏 **Height:** ${fighterData.height} cm
⚖️ **Weight:** ${fighterData.weight} kg
🏆 **Weight Class:** ${fighterData.weightClass}
🆔 **Telegram ID:** ${fighterData.telegramId}
💳 **Paid with:** ${fighterData.paymentMethod === 'stars' ? '⭐ Telegram Stars' : '🐚 Shells'}

⏰ **Submitted:** ${new Date().toLocaleString()}

Please review and approve/reject this registration.
    `.trim();

    const formData = new FormData();
    formData.append('chat_id', ADMIN_NOTIFICATION_GROUP_ID!);
    formData.append('text', message);
    formData.append('parse_mode', 'Markdown');

    // If photo exists, send it with the message
    if (fighterData.photoPath) {
      formData.append('photo', fighterData.photoPath);
      formData.append('caption', message);
      
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });
    } else {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_NOTIFICATION_GROUP_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      });
    }

    console.log('✅ Admin notification sent successfully');
  } catch (error) {
    console.error('❌ Failed to send Telegram notification:', error);
    // Don't throw - registration should succeed even if notification fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const name = formData.get('name') as string;
    const age = parseInt(formData.get('age') as string);
    const gender = formData.get('gender') as string;
    const height = parseFloat(formData.get('height') as string);
    const weight = parseFloat(formData.get('weight') as string);
    const weightClass = formData.get('weightClass') as string;
    const telegramId = formData.get('telegramId') as string;
    const paymentMethod = formData.get('paymentMethod') as string;
    const photo = formData.get('photo') as File | null;

    // Validation
    if (!name || !age || !gender || !height || !weight || !weightClass || !telegramId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if fighter already exists
    const existingFighter = await prisma.fighter.findFirst({
      where: { telegramId: BigInt(telegramId) }
    });

    if (existingFighter) {
      return NextResponse.json(
        { error: 'A fighter with this Telegram ID already exists' },
        { status: 400 }
      );
    }

    // Handle photo upload
    let photoPath = null;
    if (photo) {
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      const filename = `fighter-${telegramId}-${Date.now()}.${photo.name.split('.').pop()}`;
      const path = join(process.cwd(), 'public', 'uploads', 'fighters', filename);
      
      await writeFile(path, buffer);
      photoPath = `/uploads/fighters/${filename}`;
    }

    if (paymentMethod === 'stars') {
      // Create Telegram Stars invoice
      const invoiceResponse = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Fighter Registration',
            description: `Register as a fighter in the Fight Club`,
            payload: JSON.stringify({
              type: 'fighter_registration',
              telegramId,
              formData: {
                name,
                age,
                gender,
                height,
                weight,
                weightClass,
                photoPath
              }
            }),
            currency: 'XTR',
            prices: [{ label: 'Registration Fee', amount: REGISTRATION_COST_STARS }],
          }),
        }
      );

      if (!invoiceResponse.ok) {
        throw new Error('Failed to create payment invoice');
      }

      const invoiceData = await invoiceResponse.json();
      
      return NextResponse.json({
        success: true,
        invoiceLink: invoiceData.result,
        message: 'Redirecting to payment...'
      });

    } else if (paymentMethod === 'shells') {
      // Check user balance
      const user = await prisma.user.findUnique({
        where: { telegramId: BigInt(telegramId) }
      });

      if (!user || user.points < REGISTRATION_COST_SHELLS) {
        return NextResponse.json(
          { error: 'Insufficient shell balance' },
          { status: 400 }
        );
      }

      // Deduct shells and create fighter with pending status
      await prisma.$transaction([
        prisma.user.update({
          where: { telegramId: BigInt(telegramId) },
          data: { points: { decrement: REGISTRATION_COST_SHELLS } }
        }),
        prisma.fighter.create({
          data: {
            name,
            age,
            gender,
            height,
            weight,
            weightClass,
            telegramId: BigInt(telegramId),
            imageUrl: photoPath,
            status: 'PENDING', // Requires admin approval
          }
        })
      ]);

      // Send notification to admin group
      await sendTelegramNotification({
        name,
        age,
        gender,
        height,
        weight,
        weightClass,
        telegramId,
        paymentMethod,
        photoPath
      });

      return NextResponse.json({
        success: true,
        message: 'Registration submitted for review'
      });
    }

    return NextResponse.json(
      { error: 'Invalid payment method' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Fighter registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}