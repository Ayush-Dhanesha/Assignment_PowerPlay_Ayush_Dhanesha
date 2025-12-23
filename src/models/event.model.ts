import { Schema, model, Document } from 'mongoose';

// Event Model - MongoDB Schema
export interface IEvent extends Document {
  event_id: string;
  name: string;
  total_seats: number;
  available_seats: number;
  version: number;
  created_at: Date;
  updated_at: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    event_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    total_seats: {
      type: Number,
      required: true,
    },
    available_seats: {
      type: Number,
      required: true,
    },
    version: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Index for optimistic locking
EventSchema.index({ event_id: 1, version: 1 });

export const EventModel = model<IEvent>('Event', EventSchema);
