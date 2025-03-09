const mongoose = require("mongoose");

const AttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz",
    required: true,
    index: true,
  },
  quizTitle: { type: String, default: "" },
  userName: { type: String, default: "" },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date, default: Date.now },
  score: { type: Number, default: null }, // Null if not submitted yet
  status: {
    type: String,
    enum: ["in-progress", "submitted"],
    default: "in-progress",
  },
  answers: [
    {
      questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
      selectedAnswer: { type: String, required: true },
    },
  ],
});

AttemptSchema.index({ userId: 1, quizId: 1 }); // Composite index for efficient lookups

module.exports = mongoose.model("Attempt", AttemptSchema);
