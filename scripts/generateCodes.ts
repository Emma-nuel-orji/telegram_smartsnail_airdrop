import { prisma } from '../lib/prisma';

const generateUniqueCode = (): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

// Function to check if the generated code already exists in the database
const codeExists = async (code: string): Promise<boolean> => {
  const existingCode = await prisma.generatedCode.findUnique({
    where: { code },
  });
  return existingCode !== null;
};

// Function to insert a batch of codes into the database
const insertCodes = async (batchName: string, bookId: string, count: number) => {
  const codes = [];
  for (let i = 0; i < count; i++) {
    let uniqueCode = generateUniqueCode();

    // Check if code already exists, if so regenerate until it's unique
    while (await codeExists(uniqueCode)) {
      uniqueCode = generateUniqueCode(); // Regenerate code if duplicate is found
    }

    codes.push({ code: uniqueCode, batchId: batchName, bookId });
  }

  try {
    // Insert all the unique codes into the database
    await prisma.generatedCode.createMany({
      data: codes,
    });
    console.log(`[${new Date().toISOString()}] Successfully inserted ${count} codes in ${batchName}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error inserting ${batchName}:`, error);
  }
};

// Function to insert all codes in large batches
const insertLargeBatch = async (totalCodes: number, batchSize: number, bookId: string) => {
  let batchCount = 1;

  for (let i = 0; i < totalCodes; i += batchSize) {
    const batchName = `Batch ${batchCount}`;
    try {
      await insertCodes(batchName, bookId, batchSize);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to insert ${batchName}:`, error);
    }
    batchCount++;
  }
};

// Main function to execute the script
const main = async () => {
  const totalCodes = 50000; // Total codes to generate
  const batchSize = 5000;  // Size of each batch
  const bookId = 'bookIdForBatch1'; // Replace with your dynamic book ID or pass as an argument

  console.log(`[${new Date().toISOString()}] Starting code generation...`);
  await insertLargeBatch(totalCodes, batchSize, bookId);
  console.log(`[${new Date().toISOString()}] Code generation completed.`);
};

// Ensure Prisma disconnects properly on script completion or error
main()
  .catch((err) => console.error(`[${new Date().toISOString()}] Script failed:`, err))
  .finally(() => {
    prisma.$disconnect();
    console.log(`[${new Date().toISOString()}] Database connection closed.`);
  });

// Ensure disconnection on process exit
process.on('exit', async () => {
  await prisma.$disconnect();
  console.log(`[${new Date().toISOString()}] Process exited. Database connection closed.`);
});
