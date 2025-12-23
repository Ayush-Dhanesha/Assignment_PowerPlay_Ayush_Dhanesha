import { Schema, model, Document } from 'mongoose';

// Reservation Model - MongoDB Schema
export type ReservationStatus = 'confirmed' | 'cancelled';

export interface IReservation extends Document {
  reservation_id: string;
  event_id: string;
  partner_id: string;
  seats: number;
  status: ReservationStatus;
  created_at: Date;
  cancelled_at?: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    reservation_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    event_id: {
      type: String,
      required: true,
      index: true,
    },
    partner_id: {
      type: String,
      required: true,
    },
    seats: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
    cancelled_at: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// Indexes for performance
ReservationSchema.index({ event_id: 1, status: 1 });
ReservationSchema.index({ reservation_id: 1, status: 1 });

export const ReservationModel = model<IReservation>('Reservation', ReservationSchema);
