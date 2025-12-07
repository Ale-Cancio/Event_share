import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { eventAPI } from "../services/api";
import "./LandingPage.css";
import QRCodeDisplay from "../components/QRCodeDisplay";

const LandingPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await eventAPI.getMyEvents();
        const data = res.data?.data?.events || res.data?.events || [];
        setEvents(data);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        } else {
          setError(
            err.response?.data?.message || "Could not load your events. Please try again."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [navigate]);

  const handleCreateEvent = () => {
    navigate("/create-event");
  };

  const handleDeleteEvent = async (eventId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      await eventAPI.deleteEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.event_id !== eventId));
    } catch (err) {
      console.error("Failed to delete event:", err);
      setError(err.response?.data?.message || "Failed to delete event. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleViewQrCode = async (event) => {
    try {
      setError("");
      const eventId = event.id || event.event_id;
      const res = await eventAPI.getEventById(eventId);
      const fullEvent = res.data?.data?.event || res.data?.event;
      setSelectedEvent(fullEvent);
    } catch (err) {
      console.error("Failed to load event QR code:", err);
      setError(err.response?.data?.message || "Could not load QR code for this event. Please try again.");
    }
  };

  const handleViewGallery = (event) => {
    const id = event.event_id || event.id;
    if (!id) {
      console.error("Missing event id for gallery navigation", event);
      return;
    }
    navigate(`/events/${id}/media`);
  };

  return (
    <div className="landing-container">
      <div className="landing-card">
        <header className="landing-header">
          <h1>My Events</h1>
          <button className="btn btn-logout" onClick={handleLogout}>
            Log Out
          </button>
        </header>

        <div className="landing-actions">
          <button className="btn btn-primary" onClick={handleCreateEvent}>
            + Create New Event
          </button>
        </div>

        {loading && <p>Loading your events.</p>}

        {error && <p className="error-text">{error}</p>}

        {!loading && !error && events.length === 0 && (
          <p>You don’t have any events yet. Create your first one!</p>
        )}

        {!loading && !error && events.length > 0 && (
          <ul className="event-list">
            {events.map((event) => (
              <li key={event.event_id} className="event-item">
                <div className="event-info">
                  <h2>{event.event_name}</h2>
                  <p>{event.description}</p>
                  <p>
                    <strong>Date:</strong> {event.event_date}
                  </p>
                  <p>
                    <strong>Location:</strong> {event.location}
                  </p>
                </div>
                <div className="event-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleViewQrCode(event)}
                  >
                    View QR Code
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDeleteEvent(event.event_id)}
                  >
                    Delete
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleViewGallery(event)}
                  >
                    View Gallery
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {selectedEvent && (
          <div className="qr-modal-overlay">
            <div className="qr-modal">
              <button className="btn-close" onClick={() => setSelectedEvent(null)}>
                ✖
              </button>
              <QRCodeDisplay event={{
                ...selectedEvent,
                uploadUrl: `${selectedEvent.uploadUrl}`,
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;
