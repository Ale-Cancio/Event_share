import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import CreateEvent from './pages/CreateEvent';
import MediaUpload from "./pages/MediaUpload";
import LandingPage from "./pages/LandingPage";
import MediaViewer from './pages/MediaViewer';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/upload/:qrCode" element={<MediaUpload />} />
        <Route path="/events" element={<LandingPage />} />
        <Route path="/events/:eventId/media" element={<MediaViewer />} />
      </Routes>
    </Router>
  );
}

export default App;