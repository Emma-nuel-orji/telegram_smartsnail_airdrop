import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

// 1. Configure Transporter with Debugging enabled
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // MUST be a 16-character App Password
  },
  logger: true, // Log SMTP traffic to Vercel/Terminal logs
  debug: true,  
});

/**
 * Sends the purchase email with book links and digital codes
 */
export const sendPurchaseEmail = async (email, purchases, codes) => {
  console.log(`--- Starting Email Flow for: ${email} ---`);
  
  try {
    let bookDetails = [];

    // Fetch book details from database
    for (const purchase of purchases) {
      const book = await prisma.book.findUnique({ where: { id: purchase.bookId } });
      if (!book) {
        console.warn(`⚠️ Warning: Book ID ${purchase.bookId} not found in DB.`);
        continue;
      }

      const googleDriveLink = book.googleDriveLink || "https://drive.google.com";
      bookDetails.push(`<li><strong>${book.title}</strong> (x${purchase.quantity}) - <a href="${googleDriveLink}">Download</a></li>`);
    }

    if (bookDetails.length === 0) {
      console.error("❌ Error: No valid books found to include in email.");
      return;
    }

    const mailOptions = {
      from: `"SmartSnail Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🐚 Your SmartSnail Books and Codes',
      text: `Thank you for your purchase! Codes: ${codes.join(', ')}`, 
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #7c3aed;">Purchase Confirmed!</h2>
          <p>Click below to download your books:</p>
          <ul>${bookDetails.join('')}</ul>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0; font-weight: bold; color: #374151;">Redemption Codes:</p>
            <p style="font-family: monospace; font-size: 18px; color: #4f46e5; letter-spacing: 2px;">${codes.join(', ')}</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ SMTP SUCCESS:', info.messageId);
    return { success: true };

  } catch (error) {
    console.error('❌ SMTP CRITICAL FAILURE:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a notification for successful code redemption
 */
export const sendRedemptionEmail = async (email) => {
  const mailOptions = {
    from: `"SmartSnail" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Code Redemption Successful',
    html: `<p>Success! Your code was redeemed for <strong>100,000 shells</strong>.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Redemption email sent to:', email);
  } catch (error) {
    console.error('❌ Redemption email failed:', error);
  }
};