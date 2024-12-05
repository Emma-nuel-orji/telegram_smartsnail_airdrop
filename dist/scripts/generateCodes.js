"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("@/lib/prisma"); // Ensure prisma is properly imported
const generateUniqueCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
};
const insertCodes = async (batchName, bookId, count) => {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const uniqueCode = generateUniqueCode();
        codes.push({ code: uniqueCode, batchId: batchName, bookId });
    }
    await prisma_1.prisma.generatedCode.createMany({
        data: codes,
        skipDuplicates: true, // Ensure duplicate codes are skipped automatically
    });
};
const insertLargeBatch = async () => {
    const totalCodes = 50000;
    const batchSize = 5000;
    let batchCount = 1;
    for (let i = 0; i < totalCodes; i += batchSize) {
        await insertCodes(`Batch ${batchCount}`, 'bookIdForBatch1', batchSize);
        console.log(`Batch ${batchCount} inserted`);
        batchCount++;
    }
};
insertLargeBatch()
    .then(() => console.log('All codes inserted'))
    .catch((err) => console.error(err))
    .finally(() => prisma_1.prisma.$disconnect());
