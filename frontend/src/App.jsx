import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import UploadForm from "./components/UploadForm";

function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Event App</h1>

      {/* Navigation links (optional) */}
      <nav>
        <Link to="/">Home</Link> | <Link to="/upload">Upload</Link>
      </nav>

      <Routes>
        <Route path="/" element={<h2>Welcome to EventShare!</h2>} />
        <Route path="/upload" element={<UploadForm />} />
      </Routes>
    </div>
  );
}

export default App;
