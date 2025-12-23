import mongoose from 'mongoose';
import { EventModel } from '../models/event.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticketboss';
// Connect to MongoDB
export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}
// Initialize database - Create indexes
export async function initializeDatabase(): Promise<void> {
  try {
    // Mongoose automatically creates indexes defined in schemas
    await mongoose.connection.syncIndexes();
    console.log('✅ Database indexes synchronized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}
// Seed initial event data (500 seats)
export async function seedData(): Promise<void> {
  try {
    const existingEvent = await EventModel.findOne({ event_id: 'node-meetup-2025' });

    if (!existingEvent) {
      await EventModel.create({
        event_id: 'node-meetup-2025',
        name: 'Node.js Meet-up',
        total_seats: 500,
        available_seats: 500,
        version: 0,
      });
      console.log('✅ Database seeded with initial event data (500 seats)');
    } else {
      console.log('ℹ️  Event already exists, skipping seed');
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}
// Close database connection
export async function closeDatabase(): Promise<void> {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error);
  }
}
// Start a MongoDB session for transactions
export async function startSession(): Promise<mongoose.ClientSession> {
  return await mongoose.startSession();
}
