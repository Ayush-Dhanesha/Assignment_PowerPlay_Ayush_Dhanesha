import { ClientSession } from 'mongoose';
import { ReservationModel, IReservation } from '../models/reservation.model';

// Reservation Repository - MongoDB operations for reservations
export class ReservationRepository {
  // Create a new reservation
  async create(
    reservationId: string,
    eventId: string,
    partnerId: string,
    seats: number,
    session?: ClientSession
  ): Promise<IReservation> {
    const [reservation] = await ReservationModel.create(
      [
        {
          reservation_id: reservationId,
          event_id: eventId,
          partner_id: partnerId,
          seats,
          status: 'confirmed',
        },
      ],
      { session }
    );
    return reservation;
  }

  // Find confirmed reservation by ID
  async findConfirmedById(reservationId: string, session?: ClientSession): Promise<IReservation | null> {
    return await ReservationModel.findOne({
      reservation_id: reservationId,
      status: 'confirmed',
    }).session(session || null);
  }

  // Cancel reservation (mark as cancelled)
  async cancel(reservationId: string, session?: ClientSession): Promise<boolean> {
    const result = await ReservationModel.updateOne(
      { reservation_id: reservationId },
      {
        $set: {
          status: 'cancelled',
          cancelled_at: new Date(),
        },
      },
      { session }
    );

    return result.modifiedCount > 0;
  }
}
