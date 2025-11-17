// src/api/services/eventService.js
const pool = require('../../config/database');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const AWS = require("aws-sdk");

// AWS S3 Configuration
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

class EventService {
  // Generate a unique QR code string
  generateQRCodeString() {
    return `EVENT_${uuidv4()}`;
  }

  // Generate QR code image as Data URL
  async generateQRCodeImage(qrCodeString, frontendUrl = 'http://localhost:3000') {
    try {
      const uploadUrl = `${frontendUrl}/upload/${qrCodeString}`;
      
      const qrCodeDataUrl = await QRCode.toDataURL(uploadUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code image:', error);
      throw new Error('Failed to generate QR code image');
    }
  }

  // Create a new event
  async createEvent(userId, eventData) {
    const { event_name, event_date, location, description } = eventData;

    if (!event_name || !event_date) {
      throw new Error('Event name and date are required');
    }

    const qrCodeString = this.generateQRCodeString();
    
    // Generate S3 prefix for storing event photos
    // Format: events/{event_uuid}/
    const eventUuid = uuidv4();
    const s3Prefix = `events/${eventUuid}`;

    const query = `
      INSERT INTO public.events (
        user_id, organizer_id, qr_code, event_name, event_date, 
        location, description, status, s3_prefix, id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING event_id, user_id, organizer_id, qr_code, event_name, event_date, 
                location, description, status, created_at, s3_prefix, id
    `;

    // Set both user_id and organizer_id to the same userId value
    const values = [
      userId,           // user_id
      userId,           // organizer_id
      qrCodeString,     // qr_code
      event_name,       // event_name
      event_date,       // event_date
      location,         // location
      description,      // description
      'draft',          // status
      s3Prefix,         // s3_prefix
      eventUuid         // id (UUID)
    ];
    
    const result = await pool.query(query, values);

    return result.rows[0];
  }

  // Get event by ID
  async getEventById(eventId) {
    const query = 'SELECT * FROM public.events WHERE event_id = $1';
    const result = await pool.query(query, [eventId]);
    return result.rows[0];
  }

  // Get event by QR code (for guests)
  async getEventByQRCode(qrCode) {
    const query = `
      SELECT e.*, u.email as organizer_email 
      FROM public.events e
      JOIN public.users u ON e.organizer_id = u.user_id
      WHERE e.qr_code = $1
    `;
    const result = await pool.query(query, [qrCode]);
    return result.rows[0];
  }

  // Get all events for a user
  async getEventsByUserId(userId) {
    const query = `
      SELECT event_id, qr_code, event_name, event_date, location, description, status, created_at
      FROM public.events
      WHERE organizer_id = $1
      ORDER BY event_date DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  // Update event
  async updateEvent(eventId, userId, updates) {
    const { event_name, event_date, location, description, status } = updates;

    const existingEvent = await this.getEventById(eventId);
    if (!existingEvent) {
      throw new Error('Event not found');
    }
    if (existingEvent.organizer_id !== userId) {
      throw new Error('Unauthorized to update this event');
    }

    const query = `
      UPDATE public.events
      SET event_name = COALESCE($1, event_name),
          event_date = COALESCE($2, event_date),
          location = COALESCE($3, location),
          description = COALESCE($4, description),
          status = COALESCE($5, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $6
      RETURNING *
    `;

    const values = [event_name, event_date, location, description, status, eventId];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Delete event
  async deleteEvent(eventId, userId) {
    const existingEvent = await this.getEventById(eventId);
    if (!existingEvent) {
      throw new Error('Event not found');
    }
    if (existingEvent.organizer_id !== userId) {
      throw new Error('Unauthorized to delete this event');
    }

    const query = 'DELETE FROM public.events WHERE event_id = $1 RETURNING *';
    const result = await pool.query(query, [eventId]);
    return result.rows[0];
  }
}

module.exports = new EventService();