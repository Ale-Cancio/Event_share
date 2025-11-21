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

  //Load event info from QR code
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setEventLoading(true);
        setEventError("");

        const res = await eventAPI.getEventByQRCode(qrCode);
        const event =
          res.data?.data?.event || res.data?.event || null;

        if (!event) {
          setEventError("Event not found.");
        } else {
          setEventData(event);
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
              <div className="event-meta">
                {eventData?.date || eventData?.event_date ? (
                  <p>
                    <strong>Date:</strong>{" "}
                    {eventData.date || eventData.event_date}
                  </p>
                ) : null}
                {eventData?.location && (
                  <p>
                    <strong>Location:</strong> {eventData.location}
                  </p>
                )}
              </div>
            </header>

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
          </>
        )}
      </div>
    </div>
  );
};

export default MediaUpload;
