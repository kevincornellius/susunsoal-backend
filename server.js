const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const session = require("express-session");

// Passport [Buat OAuth]
const passport = require("passport");
require("./passport");

// App
const app = express();
app.use(express.json());

const corsOptions = {
  origin: process.env.FRONTEND_URL,
};

app.use(express.json());
app.use(cors());

// Express-Session
app.use(
  session({
    secret: process.env.SUPER_SECRET_KEY,
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Initialize MongoDB

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// Routes
const authRoutes = require("./routes/auth");
const quizRoutes = require("./routes/quiz");
const attemptRoutes = require("./routes/attempt");

app.use("/auth", authRoutes);
app.use("/quiz", quizRoutes);
app.use("/attempt", attemptRoutes);

// Run

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(5000, () => console.log("Server running on port 5000"));
