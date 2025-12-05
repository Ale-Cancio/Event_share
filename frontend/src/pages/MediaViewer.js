import React, { useEffect, useState, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { eventAPI, mediaAPI } from "../services/api";
import "./MediaViewer.css";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const MediaViewer = () => {
  const { qrCode, eventId: paramEventId } = useParams();
  const query = useQuery();
  const queryEventId = query.get("eventId");
  const navigate = useNavigate();

  const routeIdentifier = qrCode || paramEventId || queryEventId || null;

  const [eventData, setEventData] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const modalRef = useRef(null);

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


  const fetchEventAndMedia = async () => {
    if (!routeIdentifier) {
      setEventError("Missing QR code or event id in route.");
      setEventLoading(false);
      return;
    }

    setEventLoading(true);
    setEventError("");
    setLoading(true);
    setFetchError("");

    try {
      // Fetch event
      const apiCall = qrCode
        ? eventAPI.getEventByQRCode(routeIdentifier)
        : eventAPI.getEventById?.(routeIdentifier) || eventAPI.getEventByQRCode(routeIdentifier);
      const res = await apiCall;
      const event = res.data?.data?.event || res.data?.event || res.data?.data || res.data || null;

      if (!event) {
        setEventError("Event not found.");
        return;
      }
      setEventData(event);

      // Fetch all media
      let allMedia = [];
      let offset = 0;
      const limit = 100;
      while (true) {
        const eventId = event.id || event.event_id || event.eventId;
        const mediaRes = await mediaAPI.getMediaByEvent(eventId, { limit, offset });
        const items = mediaRes.data?.media || mediaRes.data?.data || mediaRes.data || [];
        allMedia = [...allMedia, ...items];
        if (items.length < limit) break;
        offset += items.length;
      }
      setMedia(allMedia);
    } catch (err) {
      console.error(err);
      setEventError(err.response?.data?.message || err.message || "Failed to load event.");
      setFetchError(err.response?.data?.message || err.message || "Failed to load media.");
    } finally {
      setEventLoading(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventAndMedia();
  }, [routeIdentifier]);

  const isVideo = (url) => /\.(mp4|mov|webm|ogg|mkv)(\?|$)/i.test(url);

  const openModal = (index) => {
    setSelectedIndex(index);
    requestAnimationFrame(() => modalRef.current?.focus());
  };
  const closeModal = () => {
    setSelectedIndex(null);
    setDeleteLoading(false);
  };
  const showPrev = () => setSelectedIndex((i) => (i === 0 ? media.length - 1 : i - 1));
  const showNext = () => setSelectedIndex((i) => (i === media.length - 1 ? 0 : i + 1));

  useEffect(() => {
    const onKey = (e) => {
      if (selectedIndex === null) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIndex, media.length]);

  const handleDelete = async () => {
    if (selectedIndex === null) return;
    const item = media[selectedIndex];
    if (!item) return;

    const ok = window.confirm("Are you sure you want to permanently delete this media item?");
    if (!ok) return;

    setDeleteLoading(true);
    try {
      await mediaAPI.deleteMedia(item.photo_id);

      setMedia((prev) => {
        const copy = [...prev];
        copy.splice(selectedIndex, 1);
        return copy;
      });

      setTimeout(() => {
        setDeleteLoading(false);
        setSelectedIndex((prevIndex) => {
          const newLength = media.length - 1;
          if (newLength <= 0) return null;
          if (prevIndex >= newLength) return newLength - 1;
          return prevIndex;
        });
      }, 0);
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Failed to delete media.");
      setDeleteLoading(false);
    }
  };

  return (
    <div className="media-upload-container" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
      <div className="media-upload-card">
        <button className="back-button" onClick={() => navigate("/events")}>
          ← Back to Landing Page
        </button>

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
              <p className="subtitle">Browse photos and videos for this event.</p>
              <div className="event-meta">
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
              </div>
            </header>

            {loading && <p className="helper-text">Loading media…</p>}
            {fetchError && <div className="error-message">{fetchError}</div>}

            <div className="gallery-grid" style={{ marginTop: 12 }}>
              {media.length === 0 && !loading ? (
                <p className="helper-text">No media uploaded yet.</p>
              ) : (
                <div className="grid">
                  {media.map((m, i) => (
                    <div key={m.photo_id || `${i}`} className="relative group media-tile">
                      {isVideo(m.file_path) ? (
                        <video
                          src={m.file_path}
                          className="media-thumb"
                          onClick={() => openModal(i)}
                          muted
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={m.file_path}
                          alt={`media-${i}`}
                          loading="lazy"
                          className="media-thumb"
                          onClick={() => openModal(i)}
                        />
                      )}
                      <div className="absolute top-1 left-1 text-xs bg-black bg-opacity-50 text-white rounded px-1 py-0.5">
                        {m.created_at ? new Date(m.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedIndex !== null && media[selectedIndex] && (
              <div ref={modalRef} tabIndex={-1} className="media-modal-overlay" onClick={closeModal}>
                <div className="media-modal" onClick={(e) => e.stopPropagation()}>
                  <button className="modal-close" aria-label="Close" onClick={closeModal}>
                    ×
                  </button>
                  <div className="media-modal-body">
                    {isVideo(media[selectedIndex].file_path) ? (
                      <video
                        src={media[selectedIndex].file_path}
                        controls
                        autoPlay
                        className="media-modal-media"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <img
                        src={media[selectedIndex].file_path}
                        alt="selected"
                        className="media-modal-media"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                  <div className="media-modal-controls" style={{ alignItems: "center" }}>
                    <button onClick={showPrev} className="btn btn-secondary" disabled={deleteLoading} aria-label="previous">
                      ‹ Prev
                    </button>
                    <button
                      onClick={handleDelete}
                      className="btn btn-danger media-delete-btn"
                      disabled={deleteLoading}
                      style={{ margin: "0 12px" }}
                      aria-label="delete"
                    >
                      {deleteLoading ? "Deleting…" : "Delete Photo"}
                    </button>
                    <button onClick={showNext} className="btn btn-secondary" disabled={deleteLoading} aria-label="next">
                      Next ›
                    </button>
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

export default MediaViewer;
