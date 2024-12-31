import { PrismaClient } from "@prisma/client";

// Create a new PrismaClient instance directly
const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: "mongodb+srv://alexandersagenonso:0FZbTiOurIsW72LD@smartsnaildb.xiueo.mongodb.net/project_0" 
    } 
  },
});

const testConnection = async () => {
    try {
        await prisma.$connect();
        console.log('Successfully connected to database');
        const userCount = await prisma.user.count();
        console.log(`Database has ${userCount} users`);
    } catch (error) {
        console.error('Connection test failed:', error);
        console.error('Error details:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection().catch(console.error);