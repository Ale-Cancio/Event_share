// src/api/controllers/mediaController.js
const pool = require("../../config/database");
const AWS = require("aws-sdk");
const multer = require("multer");
const path = require("path");
const archiver = require("archiver");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;


const upload = multer({ storage: multer.memoryStorage() });

const uploadMediaGuest = async (req, res) => {
  try {
    const { event_id } = req.body;

    if (!event_id || !req.file) {
      return res.status(400).json({ message: "Missing file or event_id" });
    }
    
    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const timestamp = Date.now();
    const eventQuery = `SELECT event_name FROM events WHERE event_id = $1`;
    const eventResult = await pool.query(eventQuery, [event_id]);

    if (eventResult.rows.length === 0) {
        return res.status(404).json({ message: "Event not found" });
    }

    const event_name = eventResult.rows[0].event_name;

    // Clean event name (no spaces or special characters)
    const safeEventName = event_name.replace(/[^a-zA-Z0-9-_]/g, "_");

    // Now use event name as folder
    const fileKey = `${safeEventName}/${timestamp}${fileExt}`;

    // Upload to S3
    await s3
      .putObject({
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: file.buffer,
        ContentType: file.mimetype, 
      })
      .promise();

    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    const created_at = new Date().toISOString();
    const updated_at = created_at;

    // Insert metadata into photos table (no user_id)
    const query = `
      INSERT INTO photos (event_id, uploaded_by_user_id, file_path, created_at, updated_at)
      VALUES ($1, NULL, $2, $3, $4)
      RETURNING *;
    `;
    const values = [event_id, fileUrl, created_at, updated_at];
    const { rows } = await pool.query(query, values);

    res.status(201).json({
      message: "Guest upload successful",
      photo: rows[0],
    });
  } catch (error) {
    console.error("Error uploading guest media:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// delete a media item: removes object from S3 (if possible) and deletes DB row
const deleteMediaHandler = async (req, res) => {
  try {
    const { photo_id } = req.params;
    if (!photo_id) {
      return res.status(400).json({ message: "Missing photo_id parameter" });
    }

    // 1) Fetch DB row so we know file_path (and optionally uploaded_by_user_id for auth)
    const fetchSql = `
      SELECT photo_id, event_id, uploaded_by_user_id, file_path, created_at
      FROM photos
      WHERE photo_id = $1
      LIMIT 1;
    `;
    const fetchResult = await pool.query(fetchSql, [photo_id]);

    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ message: "Media not found" });
    }

    const row = fetchResult.rows[0];
    const original = row.file_path || row.s3_key || row.key || "";
    const Key = getKeyFromFilePath(original);

    // Optional: authorization check
    // if (req.user && row.uploaded_by_user_id && req.user.id !== row.uploaded_by_user_id) {
    //   return res.status(403).json({ message: "Not authorized to delete this media" });
    // }

    // 2) Try to delete the object from S3 if we have a key
    if (Key) {
      try {
        await s3.deleteObject({ Bucket: BUCKET_NAME, Key }).promise();
        console.info(`Deleted S3 object: ${BUCKET_NAME}/${Key}`);
      } catch (s3Err) {
        // If the key doesn't exist or S3 deletion fails, log it and decide how to handle.
        // Treat NoSuchKey as non-fatal (object already gone). Return error for other failures.
        console.error("S3 deleteObject error", s3Err);
        // Inspect error code if present
        const code = s3Err.code || "";
        if (code !== "NoSuchKey" && code !== "NotFound" && code !== "NoSuchBucket") {
          return res.status(500).json({
            message: "Failed to delete file from storage",
            error: s3Err.message || s3Err,
          });
        }
      }
    }

    // 3) Delete DB row
    const deleteSql = `
      DELETE FROM photos
      WHERE photo_id = $1
      RETURNING photo_id, event_id, file_path, uploaded_by_user_id, created_at;
    `;
    const deleteResult = await pool.query(deleteSql, [photo_id]);
    

    if (deleteResult.rows.length === 0) {
      // Rare: row vanished between fetch and delete — return 404
      return res.status(404).json({ message: "Media not found when deleting" });
    }

    return res.json({
      message: "Media deleted",
      photo: deleteResult.rows[0],
    });
  } catch (err) {
    console.error("Error in deleteMediaHandler:", err);
    return res.status(500).json({ message: "Server error", error: err.message || err });
  }
};

function getKeyFromFilePath(filePath) {
  if (!filePath) return null;
  try {
    const url = new URL(filePath);
    // URL pathname begins with /<key>
    const key = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
    return decodeURIComponent(key);
  } catch (err) {
    // if filePath isn't a full URL, assume it's already a key
    return filePath;
  }
}

const fetchMediaForEvent = async (eventId, { limit = 24, offset = 0 } = {}) => {
  if (!eventId) throw new Error("Missing eventId");

  const sql = `
    SELECT photo_id, event_id, uploaded_by_user_id, file_path, created_at, updated_at
    FROM photos
    WHERE event_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3;
  `;
  const values = [eventId, Math.min(limit, 100), Math.max(0, offset)];
  const { rows } = await pool.query(sql, values);
  return rows;
};

const getMediaByEventHandler = async (req, res) => {
  try {
    const { event_id } = req.params;
    const limit = parseInt(req.query.limit, 10) || 24;
    const offset = parseInt(req.query.offset, 10) || 0;

    if (!event_id) {
      return res.status(400).json({ message: "Missing event_id parameter" });
    }

    // fetch rows from DB (existing function fetchMediaForEvent)
    const rows = await fetchMediaForEvent(event_id, { limit, offset });

    // map rows to include a secure presigned URL for each file_path / s3 key
    const withUrls = await Promise.all(rows.map(async (r) => {
      const original = r.file_path || r.s3_key || r.key || "";
      const Key = getKeyFromFilePath(original);
      if (!Key) return r; // nothing to sign

      // return presigned URL valid for 1 hour (3600s) — adjust Expires as needed
      try { 
        const signedUrl = await s3.getSignedUrlPromise("getObject", {
          Bucket: BUCKET_NAME,
          Key,
          Expires: 60 * 60, // 1 hour
        });
        return { ...r, file_path: signedUrl };
      } catch (err) {
        console.error("Failed to create presigned URL for key:", Key, err);
        // fallback: keep original file_path (may be public or broken)
        return r;
      }
    }));

    return res.json({ media: withUrls, limit, offset });
  } catch (err) {
    console.error("Error in getMediaByEventHandler:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

const downloadMediaZipHandler = async (req, res) => {
  try {
    const { event_id } = req.params;
    if (!event_id) return res.status(400).json({ message: "Missing event_id" });

    // Fetch rows (reuse fetchMediaForEvent but increase limit if needed)
    // You might want pagination in the future; this serves all returned rows.
    const rows = await fetchMediaForEvent(event_id, { limit: 1000, offset: 0 });

    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "No media found for this event" });
    }

    // Set response headers for ZIP streaming
    const zipFilename = `event-${event_id}-photos.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);
    res.setHeader("Transfer-Encoding", "chunked");

    // Create archiver and pipe to response
    const archive = archiver("zip", { zlib: { level: 6 } });

    // Handle archiver events
    archive.on("error", (err) => {
      console.error("Archive error:", err);
      // If headers not sent, send error; otherwise end response
      try { if (!res.headersSent) res.status(500).end(); else res.end(); } catch(e){/*noop*/ }
    });

    // finalize when piping finishes
    archive.on("end", () => {
      console.info("Archive stream ended.");
    });

    // Pipe the archive stream to the response
    archive.pipe(res);

    // Add each media file into the archive as a separate entry.
    // We'll stream directly from S3 to the archive (no temp files).
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // derive S3 key
      const original = r.file_path || r.s3_key || r.key || "";
      const Key = getKeyFromFilePath(original);
      if (!Key) {
        // Skip entries with no key
        console.warn("Skipping media with missing key or file_path:", r);
        continue;
      }

      // create a stream from S3
      try {
        const s3Stream = s3.getObject({ Bucket: BUCKET_NAME, Key }).createReadStream();

        // choose a filename inside the zip:
        // Prefer original file name if available, or use photo_id + extension
        let filename = `${r.photo_id || i}`;
        // try to preserve extension from key
        const ext = path.extname(Key) || "";
        filename = filename + ext;

        // Append stream to archive
        archive.append(s3Stream, { name: filename });
      } catch (err) {
        console.error("Failed to stream S3 object for key:", Key, err);
        // skip this file but continue; don't abort whole archive
      }
    }

    // finalize the archive (signals all entries added)
    archive.finalize();
  } catch (err) {
    console.error("Error in downloadMediaZipHandler:", err);
    if (!res.headersSent) return res.status(500).json({ message: "Server error", error: err.message });
    try { res.end(); } catch(e){/*noop*/ }
  }
};

module.exports = {
  upload,
  uploadMediaGuest,
  fetchMediaForEvent,      // exported in case other modules need it
  getMediaByEventHandler, 
  deleteMediaHandler,
  downloadMediaZipHandler, // use this as your express handler
};