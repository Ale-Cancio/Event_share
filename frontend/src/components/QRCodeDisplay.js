import React, { useState } from 'react';
import './QRCodeDisplay.css';

const QRCodeDisplay = ({ event }) => {
  const [copied, setCopied] = useState(false);

  // Copy link to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(event.uploadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = event.uploadUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download QR code as image
  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = event.qrCodeImage;
    link.download = `${event.name.replace(/\s+/g, '_')}_QRCode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="qr-display-container">
      <div className="qr-display-card">
        <div className="qr-header">
          <h2>🎉 Event Created Successfully!</h2>
          <p className="event-name">{event.name}</p>
          <span className="status-badge">{event.status}</span>
        </div>

        <div className="qr-content">
          {/* QR Code Image */}
          <div className="qr-code-section">
            <h3>Scan to Upload Photos</h3>
            <div className="qr-code-wrapper">
              <img 
                src={event.qrCodeImage} 
                alt="Event QR Code" 
                className="qr-code-image"
              />
            </div>
            <button 
              onClick={downloadQRCode}
              className="btn btn-secondary"
            >
              📥 Download QR Code
            </button>
          </div>

          {/* Shareable Link */}
          <div className="link-section">
            <h3>Shareable Link</h3>
            <div className="link-wrapper">
              <input 
                type="text" 
                value={event.uploadUrl} 
                readOnly 
                className="link-input"
              />
              <button 
                onClick={copyToClipboard}
                className={`btn btn-primary ${copied ? 'copied' : ''}`}
              >
                {copied ? '✓ Copied!' : '📋 Copy Link'}
              </button>
            </div>
            <p className="link-hint">
              Share this link or QR code with your guests so they can upload photos!
            </p>
          </div>

          {/* Event Details */}
          <div className="event-details">
            <h3>Event Details</h3>
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">
                {new Date(event.date).toLocaleString()}
              </span>
            </div>
            {event.location && (
              <div className="detail-row">
                <span className="detail-label">Location:</span>
                <span className="detail-value">{event.location}</span>
              </div>
            )}
            {event.description && (
              <div className="detail-row">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{event.description}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeDisplay;