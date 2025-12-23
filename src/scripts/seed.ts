import dotenv from 'dotenv';
import { connectDatabase, initializeDatabase, seedData, closeDatabase } from '../db/database';

dotenv.config();

async function runSeed(): Promise<void> {
  try {
    await connectDatabase();
    await initializeDatabase();
    await seedData();
    console.log('✅ Seed completed successfully');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

runSeed();
