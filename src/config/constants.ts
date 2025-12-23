/**
 * Application constants and configuration
 */

export const APP_CONFIG = {
  DEFAULT_EVENT_ID: 'node-meetup-2025',
  MAX_SEATS_PER_RESERVATION: 10,
  MIN_SEATS_PER_RESERVATION: 1,
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_MESSAGES = {
  PARTNER_ID_REQUIRED: 'partnerId is required and must be a non-empty string',
  SEATS_REQUIRED: 'seats is required',
  SEATS_MUST_BE_INTEGER: 'seats must be an integer',
  SEATS_MUST_BE_POSITIVE: 'seats must be greater than 0',
  SEATS_MAX_EXCEEDED: 'seats must not exceed 10 per request',
  INVALID_RESERVATION_ID: 'Invalid reservationId',
  NOT_ENOUGH_SEATS: 'Not enough seats left',
  RESERVATION_NOT_FOUND: 'Reservation not found or already cancelled',
  EVENT_NOT_FOUND: 'Event not found',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  CONCURRENT_UPDATE_DETECTED: 'Concurrent update detected, please retry',
} as const;

