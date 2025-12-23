import { ClientSession } from 'mongoose';
import { EventModel, IEvent } from '../models/event.model';

// Event Repository - MongoDB operations for events
export class EventRepository {
  // Find event by ID
  async findById(eventId: string, session?: ClientSession): Promise<IEvent | null> {
    return await EventModel.findOne({ event_id: eventId }).session(session || null);
  }
  // Update event seats with optimistic locking
  // Returns true if update was successful, false if version mismatch
  async updateSeatsWithVersion(
    eventId: string,
    seatsChange: number,
    currentVersion: number,
    session?: ClientSession
  ): Promise<boolean> {
    const result = await EventModel.updateOne(
      {
        event_id: eventId,
        version: currentVersion,
        $expr: {
          $gte: [{ $add: ['$available_seats', seatsChange] }, 0],
        },
      },
      {
        $inc: {
          available_seats: seatsChange,
          version: 1,
        },
        $set: {
          updated_at: new Date(),
        },
      },
      { session }
    );

    return result.modifiedCount > 0;
  }
  // Get reservation count for an event
  async getReservationCount(eventId: string): Promise<number> {
    const { ReservationModel } = await import('../models/reservation.model');
    return await ReservationModel.countDocuments({
      event_id: eventId,
      status: 'confirmed',
    });
  }
  // Create initial event (for seeding)
  async create(
    eventId: string,
    name: string,
    totalSeats: number,
    availableSeats: number,
    version: number
  ): Promise<IEvent> {
    return await EventModel.create({
      event_id: eventId,
      name,
      total_seats: totalSeats,
      available_seats: availableSeats,
      version,
    });
  }
}
