import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { trackingId: string } }
) {
  const { trackingId } = params;

  try {
    await prisma.storyShare.update({
      where: { trackingId },
      data: { clicks: { increment: 1 } },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error('App URL is undefined.');
      return NextResponse.redirect('https://default-app-url.com');
    }
    return NextResponse.redirect(appUrl);
  } catch (error) {
    console.error('Error during redirect:', error);
    return NextResponse.redirect('https://default-app-url.com');
  }
}