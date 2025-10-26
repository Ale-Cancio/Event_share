const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateToken, requireOrganizer } = require('../middleware/authMiddleware');

// Protected routes (require authentication)
router.post('/', 
  authenticateToken, 
  requireOrganizer, 
  eventController.createEvent.bind(eventController)
);

router.get('/', 
  authenticateToken, 
  requireOrganizer, 
  eventController.getMyEvents.bind(eventController)
);

router.get('/:eventId', 
  authenticateToken, 
  requireOrganizer, 
  eventController.getEventById.bind(eventController)
);

router.put('/:eventId', 
  authenticateToken, 
  requireOrganizer, 
  eventController.updateEvent.bind(eventController)
);

router.delete('/:eventId', 
  authenticateToken, 
  requireOrganizer, 
  eventController.deleteEvent.bind(eventController)
);

// Public route (no authentication)
router.get('/qr/:qrCode', 
  eventController.getEventByQRCode.bind(eventController)
);

module.exports = router;