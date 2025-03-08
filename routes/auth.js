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
router.get("/google/callback", (req, res, next) => {
  const { error, state } = req.query;

  if (error === "access_denied") {
    console.log("User denied Google OAuth access.");
    return res.redirect(
      `${process.env.FRONTEND_URL}/login?error=access_denied`
    );
  }

  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) {
      console.error("Google OAuth authentication failed:", err);
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=authentication_failed`
      );
    }

    const token = jwt.sign({ userId: user.user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const callback = state || "/";

    res.redirect(
      `${
        process.env.FRONTEND_URL
      }/auth/callback?token=${token}&callback=${encodeURIComponent(callback)}`
    );
  })(req, res, next);
});

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
