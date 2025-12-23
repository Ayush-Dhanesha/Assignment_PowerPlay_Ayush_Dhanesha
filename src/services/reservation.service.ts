import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { EventRepository } from '../repositories/event.repository';
import { ReservationRepository } from '../repositories/reservation.repository';
import { EventSummary } from '../types';
import { ERROR_MESSAGES } from '../config/constants';


// Service Layer - Business logic for reservations
// Uses MongoDB transactions for atomicity
export class ReservationService {
  private eventRepository: EventRepository;
  private reservationRepository: ReservationRepository;

  constructor() {
    this.eventRepository = new EventRepository();
    this.reservationRepository = new ReservationRepository();
  }

  // Reserve seats for an event
  async reserveSeats(eventId: string, partnerId: string, seats: number): Promise<string> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // STEP 1: Get current event state (within transaction)
      const event = await this.eventRepository.findById(eventId, session);

      if (!event) {
        throw new Error(ERROR_MESSAGES.EVENT_NOT_FOUND);
      }

      // STEP 2: Check if enough seats available
      if (event.available_seats < seats) {
        throw new Error(ERROR_MESSAGES.NOT_ENOUGH_SEATS);
      }

      // STEP 3: Optimistic locking - update only if version hasn't changed
      const updated = await this.eventRepository.updateSeatsWithVersion(
        eventId,
        -seats,
        event.version,
        session
      );

      if (!updated) {
        throw new Error(ERROR_MESSAGES.CONCURRENT_UPDATE_DETECTED);
      }

      // STEP 4: Create reservation record
      const reservationId = uuidv4();
      await this.reservationRepository.create(
        reservationId,
        eventId,
        partnerId,
        seats,
        session
      );

      // STEP 5: Commit transaction
      await session.commitTransaction();

      return reservationId;
    } catch (error) {
      // Rollback on any error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Cancel a reservation
   * Uses MongoDB transaction to ensure atomicity
   */
  async cancelReservation(reservationId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // STEP 1: Get reservation (within transaction)
      const reservation = await this.reservationRepository.findConfirmedById(reservationId, session);

      if (!reservation) {
        throw new Error(ERROR_MESSAGES.RESERVATION_NOT_FOUND);
      }

      // STEP 2: Get current event state (within transaction)
      const event = await this.eventRepository.findById(reservation.event_id, session);

      if (!event) {
        throw new Error(ERROR_MESSAGES.EVENT_NOT_FOUND);
      }

      // STEP 3: Mark reservation as cancelled
      await this.reservationRepository.cancel(reservationId, session);

      // STEP 4: Return seats to pool with optimistic locking
      const updated = await this.eventRepository.updateSeatsWithVersion(
        reservation.event_id,
        reservation.seats,
        event.version,
        session
      );

      if (!updated) {
        throw new Error(ERROR_MESSAGES.CONCURRENT_UPDATE_DETECTED);
      }

      // STEP 5: Commit transaction
      await session.commitTransaction();
    } catch (error) {
      // Rollback on any error
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  //Get event summary with reservation count
  async getEventSummary(eventId: string): Promise<EventSummary | null> {
    const event = await this.eventRepository.findById(eventId);

    if (!event) {
      return null;
    }

    const reservationCount = await this.eventRepository.getReservationCount(eventId);

    return {
      eventId: event.event_id,
      name: event.name,
      totalSeats: event.total_seats,
      availableSeats: event.available_seats,
      reservationCount,
      version: event.version,
    };
  }

  //Get all reservations for an event
  async getAllReservations(eventId: string): Promise<Array<{
    reservationId: string;
    partnerId: string;
    seats: number;
    status: string;
    createdAt: Date;
  }>> {
    const { ReservationModel } = await import('../models/reservation.model');
    const reservations = await ReservationModel.find({ event_id: eventId }).sort({ created_at: -1 });
    
    return reservations.map(r => ({
      reservationId: r.reservation_id,
      partnerId: r.partner_id,
      seats: r.seats,
      status: r.status,
      createdAt: r.created_at
    }));
  }
}
