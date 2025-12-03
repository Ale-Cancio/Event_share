import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { eventAPI, mediaAPI } from "../services/api";
import "./MediaUpload.css";

const MediaUpload = () => {
  const { qrCode } = useParams();

  const [eventData, setEventData] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const [timeRemaining, setTimeRemaining] = useState("");
  const [isUploadActive, setIsUploadActive] = useState(true);

  // Format date nicely
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Calculate time remaining until upload deadline
  const calculateTimeRemaining = (uploadEndDate) => {
    const now = new Date();
    const end = new Date(uploadEndDate);
    const diff = end - now;

    if (diff <= 0) {
      setIsUploadActive(false);
      return "Upload window has closed";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
    }
  };

  // Update countdown every minute
  useEffect(() => {
    if (!eventData?.upload_end_at) return;

    // Initial calculation
    const remaining = calculateTimeRemaining(eventData.upload_end_at);
    setTimeRemaining(remaining);

    // Update every minute
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(eventData.upload_end_at);
      setTimeRemaining(remaining);
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [eventData]);

  // Load event info from QR code
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setEventLoading(true);
        setEventError("");

        const res = await eventAPI.getEventByQRCode(qrCode);
        const event = res.data?.data?.event || res.data?.event || null;

        if (!event) {
          setEventError("Event not found.");
        } else {
          setEventData(event);
          
          // Check if upload window is active
          if (event.upload_end_at) {
            const now = new Date();
            const end = new Date(event.upload_end_at);
            setIsUploadActive(now < end);
          }
        }
      } catch (err) {
        console.error("Error loading event from QR:", err);
        setEventError(
          err.response?.data?.message ||
            "We could not find this event. Please check the link."
        );
      } finally {
        setEventLoading(false);
      }
    };

    if (qrCode) {
      fetchEvent();
    }
  }, [qrCode]);

  // Handle file selection
  const handleFileChange = (e) => {
    const chosenFile = e.target.files[0];
    setFile(chosenFile || null);
    setUploadError("");
    setUploadMessage("");
  };

  // Handle upload submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploadError("");
    setUploadMessage("");

    if (!eventData) {
      setUploadError("Event not loaded. Please refresh the page.");
      return;
    }
    if (!file) {
      setUploadError("Please choose a photo or video to upload.");
      return;
    }

    // 500MB limit
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError("File is larger than 500MB. Please choose a smaller file.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("event_id", eventData.id || eventData.event_id);

      await mediaAPI.uploadGuestMedia(formData);

      setUploadMessage("Upload successful! Thank you for sharing 🎉");
      setFile(null);
      e.target.reset();
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(
        err.response?.data?.message ||
          "Upload failed. Please try again in a moment."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="media-upload-container">
      <div className="media-upload-card">
        {eventLoading ? (
          <p>Loading event info…</p>
        ) : eventError ? (
          <div className="error-message">
            <h2>Oops!</h2>
            <p>{eventError}</p>
          </div>
        ) : (
          <>
            <header className="media-upload-header">
              <h1>{eventData?.name || eventData?.event_name}</h1>
              <p className="subtitle">
                Upload your photos and videos for this event.
              </p>
              
              <div className="event-details-box">
                {/* Date */}
                {(eventData?.date || eventData?.event_date) && (
                  <div className="detail-item">
                    <span className="detail-icon">📅</span>
                    <div>
                      <strong>Date:</strong>
                      <p>{formatDate(eventData.date || eventData.event_date)}</p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {eventData?.location && (
                  <div className="detail-item">
                    <span className="detail-icon">📍</span>
                    <div>
                      <strong>Location:</strong>
                      <p>{eventData.location}</p>
                    </div>
                  </div>
                )}

                {/* Organizer */}
                {eventData?.organizer_email && (
                  <div className="detail-item">
                    <span className="detail-icon">👤</span>
                    <div>
                      <strong>Organized by:</strong>
                      <p>{eventData.organizer_email}</p>
                    </div>
                  </div>
                )}

                {/* Upload Deadline Countdown */}
                {eventData?.upload_end_at && (
                  <div className={`detail-item deadline ${!isUploadActive ? 'expired' : ''}`}>
                    <span className="detail-icon">⏰</span>
                    <div>
                      <strong>Upload Deadline:</strong>
                      <p className={!isUploadActive ? 'expired-text' : 'countdown-text'}>
                        {timeRemaining}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </header>

            {/* Show upload form only if event is active */}
            {isUploadActive ? (
              <form className="upload-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="file">Choose a photo or video</label>
                  <input
                    type="file"
                    id="file"
                    name="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />
                  <p className="helper-text">
                    Max size: 500MB. Supported: images and videos.
                  </p>
                </div>

                {uploadError && (
                  <div className="error-message">{uploadError}</div>
                )}

                {uploadMessage && (
                  <div className="success-message">{uploadMessage}</div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-full"
                  disabled={uploading}
                >
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </form>
            ) : (
              <div className="upload-closed-message">
                <h3>⏰ Upload Window Closed</h3>
                <p>The upload deadline for this event has passed. Thank you for your interest!</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MediaUpload;