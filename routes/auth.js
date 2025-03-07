const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");
const authenticateJWT = require("../middleware/authMiddleware"); // Middleware to verify token

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"; // Fallback to localhost

// Redirect to Google OAuth
router.get("/google", (req, res, next) => {
  const { state } = req.query; // Get callback URL from frontend
  const authOptions = {
    scope: ["profile", "email"],
    state, // Store callback in state (Google will return this)
  };
  passport.authenticate("google", authOptions)(req, res, next);
});

// Google OAuth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    if (!req.user) {
      return res.redirect(`${FRONTEND_URL}/login?error=authentication_failed`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: req.user.user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Retrieve callback URL from `state`
    const callback = req.query.state || "/";

    // Redirect to frontend with token & callback
    res.redirect(
      `${FRONTEND_URL}/auth/callback?token=${token}&callback=${encodeURIComponent(
        callback
      )}`
    );
  }
);

// Get logged-in user
router.get("/me", authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
