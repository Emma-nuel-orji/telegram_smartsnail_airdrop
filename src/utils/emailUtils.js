import 'dotenv/config';
import nodemailer from 'nodemailer';
import { prisma } from '@/prisma/client';

// Configure the transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,

  },
});

// Send purchase email
export const sendPurchaseEmail = async (email, purchases, codes) => {
  let bookDetails = [];

  for (const purchase of purchases) {
    const book = await prisma.book.findUnique({ where: { id: purchase.bookId } });
    if (!book) continue;

    // Replace this with actual Google Drive links stored in your database
    const googleDriveLink = book.googleDriveLink || "https://drive.google.com/file/d/yourfileid/view?usp=sharing";
    
    bookDetails.push(`${book.title} (x${purchase.quantity}) - [Download](${googleDriveLink})`);
  }
 

  const mailOptions = {
    from: process.env.SMARTSNAIL_EMAIL,
    to: email,
    subject: 'Your Books and Codes',
    text: `
      Thank you for your purchase!
      Books:
      ${bookDetails.join('\n')}
      
      Codes: ${codes.join(', ')}
    `,
    html: `
      <p>Thank you for your purchase!</p>
      <p><strong>Books:</strong></p>
      <ul>
        ${bookDetails.map(book => `<li>${book}</li>`).join('')}
      </ul>
      <p><strong>Codes:</strong> ${codes.join(', ')}</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Purchase email sent successfully');
  } catch (error) {
    console.error('Error sending purchase email:', error);
  }
};


// Send redemption email
export const sendRedemptionEmail = async (email) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Code Redemption Successful',
    text: 'Congratulations! Your code has been successfully redeemed, and you have been rewarded with 100,000 shells.',
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Redemption email sent successfully');
  } catch (error) {
    console.error('Error sending redemption email:', error);
  }
};
