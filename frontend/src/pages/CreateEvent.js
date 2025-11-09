import React, { useState } from 'react';
import { eventAPI } from '../services/api';
import QRCodeDisplay from '../components/QRCodeDisplay';
import './CreateEvent.css';

const CreateEvent = () => {
  const [formData, setFormData] = useState({
    event_name: '',
    event_date: '',
    location: '',
    description: ''
  });
  
  const [createdEvent, setCreatedEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await eventAPI.createEvent(formData);
      setCreatedEvent(response.data.data.event);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
      console.error('Error creating event:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnother = () => {
    setCreatedEvent(null);
    setFormData({
      event_name: '',
      event_date: '',
      location: '',
      description: ''
    });
  };

  // If event was created, show QR code display
  if (createdEvent) {
    return (
      <div>
        <QRCodeDisplay event={createdEvent} />
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={handleCreateAnother} className="btn btn-primary">
            Create Another Event
          </button>
        </div>
      </div>
    );
  }

  // Otherwise show the creation form
  return (
    <div className="create-event-container">
      <div className="create-event-card">
        <h1>Create New Event</h1>
        <p className="subtitle">Set up photo sharing for your event</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="event_name">Event Name *</label>
            <input
              type="text"
              id="event_name"
              name="event_name"
              value={formData.event_name}
              onChange={handleChange}
              placeholder="e.g., Sarah's Birthday Party"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event_date">Event Date & Time *</label>
            <input
              type="datetime-local"
              id="event_date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Miami Beach Hotel"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell your guests about the event..."
              rows="4"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? 'Creating Event...' : '🎉 Create Event & Generate QR Code'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;