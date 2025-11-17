import React, { useState } from "react";
import axiosClient from "../api/axiosClient";

export default function UploadForm() {
  const [file, setFile] = useState(null);
  const [eventId, setEventId] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !eventId) {
      setMessage("Please select a file and enter an event ID");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("event_id", eventId);

    try {
      const response = await axiosClient.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMessage(`✅ Upload successful! File: ${response.data.photo.file_path}`);
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("❌ Upload failed: " + error.response?.data?.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "auto" }}>
      <h2>Guest Upload</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter Event ID"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        />
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          style={{ display: "block", marginTop: 10 }}
        />
        <button type="submit" style={{ marginTop: 10 }}>
          Upload
        </button>
      </form>
      <p>{message}</p>
    </div>
  );
}
