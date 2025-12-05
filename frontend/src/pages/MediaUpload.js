import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { eventAPI, mediaAPI } from "../services/api";
import "./MediaUpload.css";

// Utility to detect video files
const isVideo = (url) => /\.(mp4|mov|webm|ogg|mkv)(\?|$)/i.test(url);

const MediaUpload = () => {
  const { qrCode } = useParams();

  const [eventData, setEventData] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  const [media, setMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const [timeRemaining, setTimeRemaining] = useState("");
  const [isUploadActive, setIsUploadActive] = useState(true);

  // Format date nicely
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
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
      return `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""} remaining`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? "s" : ""}, ${minutes} minute${minutes !== 1 ? "s" : ""} remaining`;
    } else {
      return `${minutes} minute${minutes !== 1 ? "s" : ""} remaining`;
    }
  };

  // Update countdown every minute
  useEffect(() => {
    if (!eventData?.upload_end_at) return;

    const remaining = calculateTimeRemaining(eventData.upload_end_at);
    setTimeRemaining(remaining);

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(eventData.upload_end_at);
      setTimeRemaining(remaining);
    }, 60000);

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

          if (event.upload_end_at) {
            const now = new Date();
            const end = new Date(event.upload_end_at);
            setIsUploadActive(now < end);
          }
        }
      } catch (err) {
        console.error("Error loading event from QR:", err);
        setEventError(err.response?.data?.message || "We could not find this event. Please check the link.");
      } finally {
        setEventLoading(false);
      }
    };

    if (qrCode) fetchEvent();
  }, [qrCode]);

  // Fetch media for event
  useEffect(() => {
    if (!eventData) {
      setMedia([]);
      return;
    }

    const fetchMedia = async () => {
      setMediaLoading(true);
      setMediaError("");
      try {
        const eventId = eventData.id || eventData.event_id || eventData.eventId;
        if (!eventId) throw new Error("Event id not found");

        const res = await mediaAPI.getMediaByEvent(eventId, { limit: 100, offset: 0 });
        const items = res.data?.media || res.data?.data || res.data || [];
        setMedia(items);
      } catch (err) {
        console.error("Failed to load media:", err);
        setMediaError(err.response?.data?.message || err.message || "Could not load media.");
      } finally {
        setMediaLoading(false);
      }
    };

    fetchMedia();
  }, [eventData]);

  const handleFileChange = (e) => {
    const chosenFile = e.target.files[0];
    setFile(chosenFile || null);
    setUploadError("");
    setUploadMessage("");
  };

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

      // Refresh gallery
      const eventId = eventData.id || eventData.event_id || eventData.eventId;
      const refreshed = await mediaAPI.getMediaByEvent(eventId, { limit: 100, offset: 0 });
      const items = refreshed.data?.media || refreshed.data?.data || refreshed.data || [];
      setMedia(items);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err.response?.data?.message || "Upload failed. Please try again in a moment.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!eventData) return;
    try {
      setMediaLoading(true);
      const eventId = eventData.id || eventData.event_id || eventData.eventId;
      const res = await mediaAPI.downloadMediaZip(eventId);
      const blob = new Blob([res.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event-${eventId}-photos.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download ZIP:", err);
      alert(err?.response?.data?.message || err?.message || "Failed to download photos.");
    } finally {
      setMediaLoading(false);
    }
  };

  const handleDownloadSelected = () => {
    if (selectedIndex === null) return;
    const item = media[selectedIndex];
    const url = item?.file_path;
    if (!url) return;

    const fileName = url.split("/").pop() || `media-${Date.now()}`;
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", fileName);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const openModal = (idx) => setSelectedIndex(idx);
  const closeModal = () => setSelectedIndex(null);
  const showPrev = () => setSelectedIndex((i) => (i === 0 ? media.length - 1 : i - 1));
  const showNext = () => setSelectedIndex((i) => (i === media.length - 1 ? 0 : i + 1));

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
              <p className="subtitle">Upload your photos and videos for this event.</p>

              <div className="event-details-box">
                {(eventData?.date || eventData?.event_date) && (
                  <div className="detail-item">
                    <span className="detail-icon">📅</span>
                    <div>
                      <strong>Date:</strong>
                      <p>{formatDate(eventData.date || eventData.event_date)}</p>
                    </div>
                  </div>
                )}
                {eventData?.location && (
                  <div className="detail-item">
                    <span className="detail-icon">📍</span>
                    <div>
                      <strong>Location:</strong>
                      <p>{eventData.location}</p>
                    </div>
                  </div>
                )}
                {eventData?.organizer_email && (
                  <div className="detail-item">
                    <span className="detail-icon">👤</span>
                    <div>
                      <strong>Organized by:</strong>
                      <p>{eventData.organizer_email}</p>
                    </div>
                  </div>
                )}
                {eventData?.upload_end_at && (
                  <div className={`detail-item deadline ${!isUploadActive ? "expired" : ""}`}>
                    <span className="detail-icon">⏰</span>
                    <div>
                      <strong>Upload Deadline:</strong>
                      <p className={!isUploadActive ? "expired-text" : "countdown-text"}>{timeRemaining}</p>
                    </div>
                  </div>
                )}
              </div>
            </header>

            {isUploadActive ? (
              <form className="upload-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="file">Choose a photo or video</label>
                  <input type="file" id="file" name="file" accept="image/*,video/*" onChange={handleFileChange} />
                  <p className="helper-text">Max size: 500MB. Supported: images and videos.</p>
                </div>
                {uploadError && <div className="error-message">{uploadError}</div>}
                {uploadMessage && <div className="success-message">{uploadMessage}</div>}
                <button type="submit" className="btn btn-primary btn-full" disabled={uploading}>
                  {uploading ? "Uploading…" : "Upload"}
                </button>
              </form>
            ) : (
              <div className="upload-closed-message">
                <h3>⏰ Upload Window Closed</h3>
                <p>The upload deadline for this event has passed. Thank you for your interest!</p>
              </div>
            )}

            <section className="upload-gallery">
              <h3 className="gallery-title">Photos & Videos</h3>
              <div>
                <button className="btn btn-secondary" onClick={handleDownloadAll} disabled={mediaLoading || media.length === 0}>
                  {mediaLoading ? "Preparing ZIP…" : `Download All (${media.length})`}
                </button>
              </div>
              {mediaLoading ? (
                <p className="helper-text">Loading media…</p>
              ) : mediaError ? (
                <div className="error-message">{mediaError}</div>
              ) : media.length === 0 ? (
                <p className="helper-text">No media uploaded yet.</p>
              ) : (
                <div className="grid">
                  {media.map((m, i) => (
                    <div key={m.photo_id || m.id || i} className="relative group media-tile">
                      {isVideo(m.file_path) ? (
                        <video src={m.file_path} className="media-thumb" onClick={() => openModal(i)} muted preload="metadata" />
                      ) : (
                        <img src={m.file_path} alt={`media-${i}`} loading="lazy" className="media-thumb" onClick={() => openModal(i)} />
                      )}
                      <div className="media-caption">{m.created_at ? new Date(m.created_at).toLocaleString() : ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {selectedIndex !== null && media[selectedIndex] && (
              <div className="media-modal-overlay" onClick={closeModal}>
                <div className="media-modal" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" onClick={closeModal}>×</button>
                  <div className="media-modal-body">
                    {isVideo(media[selectedIndex].file_path) ? (
                      <video src={media[selectedIndex].file_path} controls autoPlay className="media-modal-media" />
                    ) : (
                      <img src={media[selectedIndex].file_path} alt="selected" className="media-modal-media" />
                    )}
                  </div>
                  <div className="media-modal-controls">
                    <button onClick={showPrev} className="btn btn-secondary">‹ Prev</button>
                    <button onClick={handleDownloadSelected} className="btn btn-primary" disabled={downloading}>
                      {downloading ? "Downloading…" : "Download"}
                    </button>
                    <button onClick={showNext} className="btn btn-secondary">Next ›</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MediaUpload;
