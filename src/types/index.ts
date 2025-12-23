/**
 * Type definitions for API DTOs (Data Transfer Objects)
 */

// API Request/Response types
export interface ReservationRequest {
  partnerId: string;
  seats: number;
}

export interface ReservationResponse {
  reservationId: string;
  seats: number;
  status: 'confirmed';
}

export interface EventSummary {
  eventId: string;
  name: string;
  totalSeats: number;
  availableSeats: number;
  reservationCount: number;
  version: number;
}

export interface ErrorResponse {
  error: string;
}
