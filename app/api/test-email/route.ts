// app/api/test-email/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Step 1: verify credentials
  try {
    await transporter.verify();
    console.log('✅ SMTP credentials valid');
  } catch (err: any) {
    console.error('❌ SMTP verify failed:', err.message);
    return NextResponse.json({ step: 'verify', error: err.message }, { status: 500 });
  }

  // Step 2: actually send a test email
  try {
    const info = await transporter.sendMail({
      from: `"Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // send to yourself
      subject: 'SMTP test',
      text: 'If you see this, SMTP works.',
    });
    console.log('✅ Email sent:', info.messageId);
    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    console.error('❌ sendMail failed:', err.message);
    return NextResponse.json({ step: 'sendMail', error: err.message }, { status: 500 });
  }
}