import express from "express";
import dotenv from "dotenv";
dotenv.config({ path: "./db.env" });
import authRoutes from "./src/api/routes/authRoutes.js";
import eventRoutes from "./src/api/routes/eventRoutes.js";
import { supabase } from "./src/database/db.js";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.get("/test-db", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("*").limit(1);
    if (error) throw error;
    res.json({
      message: "Connected to DB",
      exampleRow: data[0] || "No rows found",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to connect to DB",
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));