import express from "express";
import { loginUser, logoutUser } from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/auth/login
router.post("/login", loginUser);

// POST /api/auth/logout
router.post("/logout", logoutUser);

// GET /api/auth/protected
router.get("/protected", authenticate, (req, res) => {
    res.json({
        message: `Welcome ${req.user.email}, this is a protected route.`,
        user: req.user
    });
});

export default router;