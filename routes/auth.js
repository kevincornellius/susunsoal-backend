const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");
const authenticateJWT = require("../middleware/authMiddleware"); // Middleware to verify token

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"; // Fallback to localhost

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Redirect to Google OAuth
 *     description: Redirects users to Google's OAuth page for authentication.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional callback URL to redirect the user after authentication.
 *     responses:
 *       302:
 *         description: Redirects to Google's OAuth page.
 */
router.get("/google", (req, res, next) => {
  const { state } = req.query; // Get callback URL from frontend
  const authOptions = {
    scope: ["profile", "email"],
    state, // Store callback in state (Google will return this)
  };
  passport.authenticate("google", authOptions)(req, res, next);
});

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth Callback
 *     description: Handles the response from Google after user authentication.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         required: false
 *         description: Error message if authentication was denied or failed.
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         required: false
 *         description: The callback URL provided in the initial OAuth request.
 *     responses:
 *       302:
 *         description: Redirects to frontend with authentication token on success, or error message on failure.
 *       401:
 *         description: Authentication failed.
 */
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

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get logged-in user
 *     description: Returns the currently authenticated user's details.
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Returns user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *       401:
 *         description: Unauthorized (JWT missing or invalid).
 *       500:
 *         description: Internal server error.
 */
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
