import { Request, Response } from 'express';
import { ReservationService } from '../services/reservation.service';
import { ReservationRequest, ReservationResponse, ErrorResponse } from '../types';
import { APP_CONFIG, HTTP_STATUS, ERROR_MESSAGES } from '../config/constants';

// Controller Layer - Handles HTTP requests and responses
export class ReservationController {
  constructor(private reservationService: ReservationService) {}

  // POST /reservations
  // Reserve seats for an event
  reserveSeats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { partnerId, seats } = req.body as ReservationRequest;

      // Call service layer
      const reservationId = await this.reservationService.reserveSeats(
        APP_CONFIG.DEFAULT_EVENT_ID,
        partnerId,
        seats
      );

      // Build response
      const response: ReservationResponse = {
        reservationId,
        seats,
        status: 'confirmed',
      };

      res.status(HTTP_STATUS.CREATED).json(response);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // DELETE /reservations/:reservationId
  // Cancel a reservation
  cancelReservation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reservationId } = req.params;

      // Call service layer
      await this.reservationService.cancelReservation(reservationId);

      res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // GET /reservations
  getEventSummary = async (_req: Request, res: Response): Promise<void> => {
    try {
      // Call service layer
      const summary = await this.reservationService.getEventSummary(
        APP_CONFIG.DEFAULT_EVENT_ID
      );

      if (!summary) {
        const errorResponse: ErrorResponse = {
          error: ERROR_MESSAGES.EVENT_NOT_FOUND,
        };
        res.status(HTTP_STATUS.NOT_FOUND).json(errorResponse);
        return;
      }

      res.status(HTTP_STATUS.OK).json(summary);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // GET /reservations/list
  // Get all reservations
  getAllReservations = async (_req: Request, res: Response): Promise<void> => {
    try {
      const reservations = await this.reservationService.getAllReservations(
        APP_CONFIG.DEFAULT_EVENT_ID
      );

      res.status(HTTP_STATUS.OK).json({
        eventId: APP_CONFIG.DEFAULT_EVENT_ID,
        totalReservations: reservations.length,
        reservations
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Error handler - Maps service errors to HTTP responses
  private handleError(error: unknown, res: Response): void {
    console.error('Controller error:', error);

    if (error instanceof Error) {
      // Map business logic errors to appropriate HTTP status codes
      switch (error.message) {
        case ERROR_MESSAGES.NOT_ENOUGH_SEATS:
          res.status(HTTP_STATUS.CONFLICT).json({ error: error.message } as ErrorResponse);
          return;

        case ERROR_MESSAGES.RESERVATION_NOT_FOUND:
        case ERROR_MESSAGES.EVENT_NOT_FOUND:
          res.status(HTTP_STATUS.NOT_FOUND).json({ error: error.message } as ErrorResponse);
          return;

        case ERROR_MESSAGES.CONCURRENT_UPDATE_DETECTED:
          res.status(HTTP_STATUS.CONFLICT).json({ error: error.message } as ErrorResponse);
          return;

        default:
          res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
          } as ErrorResponse);
          return;
      }
    }

    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    } as ErrorResponse);
  }
}
