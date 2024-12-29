import nodemailer from 'nodemailer';
import  prisma  from '@/lib/prisma';
import 'dotenv/config';

// Configure the transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMARTSNAIL_EMAIL,
    pass: process.env.SMARTSNAIL_PASSWORD,
  },
});

// Send purchase email
export const sendPurchaseEmail = async (email, purchases, codes) => {
  let bookTitles = [];
  let attachedFiles = [];

  for (const purchase of purchases) {
    const book = await prisma.book.findUnique({ where: { id: purchase.bookId } });
    if (!book) continue;

    bookTitles.push(`${book.title} (x${purchase.quantity})`);
    attachedFiles.push(`/path/to/books/${book.title}.pdf`); // Adjust to actual file paths
  }

  const mailOptions = {
    from: process.env.SMARTSNAIL_EMAIL,
    to: email,
    subject: 'Your Books and Codes',
    text: `
      Thank you for your purchase!
      Books: ${bookTitles.join(', ')}
      Codes: ${codes.join(', ')}
    `,
    attachments: attachedFiles.map((file) => ({
      filename: file.split('/').pop(),
      path: file,
    })),
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
    from: process.env.SMARTSNAIL_EMAIL,
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
