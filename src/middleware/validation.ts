import { Request, Response, NextFunction } from 'express';
import { ReservationRequest } from '../types';
import { APP_CONFIG, HTTP_STATUS, ERROR_MESSAGES } from '../config/constants';

/**
 * Validate reservation request body
 */
export function validateReservationRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { partnerId, seats } = req.body as Partial<ReservationRequest>;

  // Check if partnerId exists
  if (!partnerId || typeof partnerId !== 'string' || partnerId.trim() === '') {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      error: ERROR_MESSAGES.PARTNER_ID_REQUIRED 
    });
    return;
  }

  // Check if seats exists and is a number
  if (seats === undefined || seats === null) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      error: ERROR_MESSAGES.SEATS_REQUIRED 
    });
    return;
  }

  if (typeof seats !== 'number' || !Number.isInteger(seats)) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      error: ERROR_MESSAGES.SEATS_MUST_BE_INTEGER 
    });
    return;
  }

  // Check seats range
  if (seats < APP_CONFIG.MIN_SEATS_PER_RESERVATION) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      error: ERROR_MESSAGES.SEATS_MUST_BE_POSITIVE 
    });
    return;
  }

  if (seats > APP_CONFIG.MAX_SEATS_PER_RESERVATION) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      error: ERROR_MESSAGES.SEATS_MAX_EXCEEDED 
    });
    return;
  }

  next();
}

/**
 * Validate reservation ID parameter
 */
export function validateReservationId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { reservationId } = req.params;

  if (!reservationId || typeof reservationId !== 'string' || reservationId.trim() === '') {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ 
      error: ERROR_MESSAGES.INVALID_RESERVATION_ID 
    });
    return;
  }

  next();
}

/**
 * Global error handler
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  // Don't send response if headers already sent
  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    error: 'Not found',
    path: req.path
  });
}
