import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.controller';
import { ReservationService } from '../services/reservation.service';
import {
  validateReservationRequest,
  validateReservationId
} from '../middleware/validation';

const router = Router();

// Initialize service and controller
const reservationService = new ReservationService();
const reservationController = new ReservationController(reservationService);

/**
 * POST /reservations
 * Reserve seats for an event
 */
router.post(
  '/',
  validateReservationRequest,
  reservationController.reserveSeats
);

/**
 * DELETE /reservations/:reservationId
 * Cancel a reservation
 */
router.delete(
  '/:reservationId',
  validateReservationId,
  reservationController.cancelReservation
);

/**
 * GET /reservations/list
 * Get all reservations (must be before '/' to avoid conflict)
 */
router.get('/list', reservationController.getAllReservations);

/**
 * GET /reservations
 * Get event summary
 */
router.get('/', reservationController.getEventSummary);

export default router;
