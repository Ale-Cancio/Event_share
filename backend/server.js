const express = require('express');
const cors = require('cors');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config({ path: './db.env' });

// Import routes
const userRoutes = require('./src/api/routes/userRoutes');
const eventRoutes = require('./src/api/routes/eventRoutes');
const mediaRoutes = require('./src/api/routes/mediaRoutes');

// Import database to test connection
require('./src/config/database');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ----------------------
// Middleware
// ----------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----------------------
// API Routes
// ----------------------
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// ----------------------
// Serve React frontend 
// ----------------------
const frontendBuildPath = path.join(process.cwd(), '../frontend/build');

app.use(express.static(frontendBuildPath));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// ----------------------
// 404 handler (for API routes that don’t exist)
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      success: false,
      message: 'Route not found'
    });
  }
});

// ----------------------
// Error handler
// ----------------------
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ----------------------
// Start server
// ----------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Registration endpoint: http://localhost:${PORT}/api/users/register`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/users/login`);

  const frontendUrl = `http://localhost:${PORT}`;
  switch (process.platform) {
    case 'win32':
      exec(`start ${frontendUrl}`);
      break;
    
  }
});

module.exports = app;
