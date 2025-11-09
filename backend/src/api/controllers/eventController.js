const eventService = require('../services/eventService');

class EventController {
  // Create a new event with QR code
  async createEvent(req, res) {
    try {
      const { event_name, event_date, location, description } = req.body;
      const userId = req.user.userId;

      if (!event_name || !event_date) {
        return res.status(400).json({
          success: false,
          message: 'Event name and date are required'
        });
      }

      const newEvent = await eventService.createEvent(userId, {
        event_name,
        event_date,
        location,
        description
      });

      const qrCodeImage = await eventService.generateQRCodeImage(newEvent.qr_code);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: {
          event: {
            id: newEvent.event_id,
            name: newEvent.event_name,
            date: newEvent.event_date,
            location: newEvent.location,
            description: newEvent.description,
            status: newEvent.status,
            qrCode: newEvent.qr_code,
            qrCodeImage: qrCodeImage,
            uploadUrl: `http://localhost:3000/upload/${newEvent.qr_code}`,
            createdAt: newEvent.created_at
          }
        }
      });

    } catch (error) {
      console.error('Create event error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Server error while creating event'
      });
    }
  }

  // Get all events for logged-in organizer
  async getMyEvents(req, res) {
    try {
      const userId = req.user.userId;
      const events = await eventService.getEventsByUserId(userId);

      res.status(200).json({
        success: true,
        data: {
          events: events,
          count: events.length
        }
      });

    } catch (error) {
      console.error('Get events error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching events'
      });
    }
  }

  // Get single event by ID
  async getEventById(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;

      const event = await eventService.getEventById(eventId);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      if (event.organizer_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to access this event'
        });
      }

      const qrCodeImage = await eventService.generateQRCodeImage(event.qr_code);

      res.status(200).json({
        success: true,
        data: {
          event: {
            id: event.event_id,
            name: event.event_name,
            date: event.event_date,
            location: event.location,
            description: event.description,
            status: event.status,
            qrCode: event.qr_code,
            qrCodeImage: qrCodeImage,
            uploadUrl: `http://localhost:3000/upload/${event.qr_code}`,
            createdAt: event.created_at
          }
        }
      });

    } catch (error) {
      console.error('Get event error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching event'
      });
    }
  }

  // Get event by QR code (public - for guests)
  async getEventByQRCode(req, res) {
    try {
      const { qrCode } = req.params;

      const event = await eventService.getEventByQRCode(qrCode);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Invalid QR code or event not found'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          event: {
            id: event.event_id,
            name: event.event_name,
            date: event.event_date,
            location: event.location,
            description: event.description,
            status: event.status,
            qrCode: event.qr_code
          }
        }
      });

    } catch (error) {
      console.error('Get event by QR code error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while fetching event'
      });
    }
  }

  // Update event
  async updateEvent(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;
      const updates = req.body;

      const updatedEvent = await eventService.updateEvent(eventId, userId, updates);

      res.status(200).json({
        success: true,
        message: 'Event updated successfully',
        data: {
          event: updatedEvent
        }
      });

    } catch (error) {
      console.error('Update event error:', error);
      
      if (error.message === 'Event not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message === 'Unauthorized to update this event') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error while updating event'
      });
    }
  }

  // Delete event
  async deleteEvent(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user.userId;

      await eventService.deleteEvent(eventId, userId);

      res.status(200).json({
        success: true,
        message: 'Event deleted successfully'
      });

    } catch (error) {
      console.error('Delete event error:', error);
      
      if (error.message === 'Event not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message === 'Unauthorized to delete this event') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error while deleting event'
      });
    }
  }
}

module.exports = new EventController();