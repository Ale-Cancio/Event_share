import express from "express";
import { createEvent } from "../controllers/eventController.js";

const router = express.Router();

// POST /events/create
router.post("/create", createEvent);

export default router;
