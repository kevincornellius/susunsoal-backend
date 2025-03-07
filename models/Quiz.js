const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["multiple-choice", "short-answer"],
    required: true,
  },
  questionText: { type: String, required: true },
  options: [{ type: String }], // Only used for multiple-choice
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: null },
});

const QuizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  category: [{ type: String }],
  coverImage: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  questions: [QuestionSchema],
  timeLimit: { type: Number, default: 120 },
  maxAttemptsPerUser: { type: Number, default: null },
  tags: [{ type: String, maxlength: 20 }],
  totalScore: { type: Number, default: 0 },
  attemptCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  lastEdited: { type: Date, default: null },

  dateOpens: { type: Date, required: true },
  dateCloses: { type: Date, required: true },
  published: { type: Boolean, default: false },
});

QuizSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.lastEdited = new Date();
  }
  next();
});

module.exports = mongoose.model("Quiz", QuizSchema);
