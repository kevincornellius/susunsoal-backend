const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const authenticateJWT = require("../middleware/authMiddleware"); // Middleware to verify token

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"; // Fallback to localhost

router.post("/save", authenticateJWT, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      coverImage,
      questions,
      timeLimit,
      maxAttemptsPerUser,
      tags,
      totalScore,
      dateOpens,
      dateCloses,
      published,
    } = req.body;

    // Backend validate
    if (!title.trim())
      return res.status(400).json({ error: "Title is required" });
    if (!timeLimit || timeLimit < 1)
      return res
        .status(400)
        .json({ error: "Time limit must be at least 1 minute" });
    if (!dateOpens || !dateCloses)
      return res
        .status(400)
        .json({ error: "Quiz must have an opening and closing date" });
    if (new Date(dateOpens) >= new Date(dateCloses)) {
      return res
        .status(400)
        .json({ error: "Closing date must be after opening date" });
    }

    if (!questions || questions.length === 0)
      return res
        .status(400)
        .json({ error: "Quiz must have at least one question" });

    for (const question of questions) {
      if (!question.questionText.trim()) {
        return res.status(400).json({ error: "Every question must have text" });
      }

      if (question.type === "multiple-choice") {
        if (!question.options || question.options.length < 2) {
          return res.status(400).json({
            error: `Question "${question.questionText}" must have at least 2 options`,
          });
        }
      }
    }

    // Save the Quiz with the Authenticated User
    const newQuiz = new Quiz({
      title,
      description,
      category,
      coverImage,
      createdBy: req.user._id, // Save user ID from the authenticated request
      questions,
      timeLimit,
      maxAttemptsPerUser,
      tags,
      totalScore,
      dateOpens: new Date(dateOpens),
      dateCloses: new Date(dateCloses),
      published,
    });

    await newQuiz.save();
    res.status(201).json({ message: "Quiz saved successfully", quiz: newQuiz });
  } catch (error) {
    console.error("Error saving quiz:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/edit/:quizId", authenticateJWT, async (req, res) => {
  try {
    const { quizId } = req.params;
    const {
      title,
      description,
      category,
      coverImage,
      questions,
      timeLimit,
      maxAttemptsPerUser,
      tags,
      totalScore,
      dateOpens,
      dateCloses,
      published,
    } = req.body;

    let quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Unauthorized to edit this quiz" });
    }

    if (quiz.attemptCount > 0) {
      return res
        .status(403)
        .json({ error: "Quiz cannot be edited after it has been attempted." });
    }
    // Backend validation
    if (!title.trim())
      return res.status(400).json({ error: "Title is required" });
    if (!timeLimit || timeLimit < 1) {
      return res
        .status(400)
        .json({ error: "Time limit must be at least 1 minute" });
    }
    if (!dateOpens || !dateCloses) {
      return res
        .status(400)
        .json({ error: "Quiz must have an opening and closing date" });
    }
    if (new Date(dateOpens) >= new Date(dateCloses)) {
      return res
        .status(400)
        .json({ error: "Closing date must be after opening date" });
    }
    if (!questions || questions.length === 0) {
      return res
        .status(400)
        .json({ error: "Quiz must have at least one question" });
    }

    for (const question of questions) {
      if (!question.questionText.trim()) {
        return res.status(400).json({ error: "Every question must have text" });
      }
      if (question.type === "multiple-choice") {
        if (!question.options || question.options.length < 2) {
          return res.status(400).json({
            error: `Question "${question.questionText}" must have at least 2 options`,
          });
        }
      }
    }

    // Update quiz fields
    quiz.title = title;
    quiz.description = description;
    quiz.category = category;
    quiz.coverImage = coverImage;
    quiz.questions = questions;
    quiz.timeLimit = timeLimit;
    quiz.maxAttemptsPerUser = maxAttemptsPerUser;
    quiz.tags = tags;
    quiz.totalScore = totalScore;
    quiz.dateOpens = new Date(dateOpens);
    quiz.dateCloses = new Date(dateCloses);
    quiz.published = published;
    quiz.lastEdited = new Date();

    // Save updated quiz
    await quiz.save();

    res.status(200).json({ message: "Quiz updated successfully", quiz });
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/delete/:quizId", authenticateJWT, async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    if (quiz.createdBy.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ error: "Unauthorized to delete this quiz" });
    }

    if (quiz.attemptCount > 0) {
      return res
        .status(403)
        .json({ error: "Quiz cannot be deleted after it has been attempted." });
    }

    // Delete quiz
    await Quiz.findByIdAndDelete(quizId);

    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const now = new Date();

    const quizzes = await Quiz.find({
      published: true,
      dateOpens: { $lte: now },
    }).select("-questions"); // Dont pass question

    res.json({ quizzes });
  } catch (error) {
    console.error("Error fetching available quizzes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/my-quizzes", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user._id; // Get user ID from JWT
    const quizzes = await Quiz.find({ createdBy: userId });

    res.json({ quizzes });
  } catch (error) {
    console.error("Error fetching user quizzes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:quizId", authenticateJWT, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const userId = req.user._id.toString();
    const isCreator = quiz.createdBy.toString() === userId; // Check if user is the creator
    const now = new Date();

    if ((!quiz.published || now < quiz.dateOpens) && !isCreator) {
      return res
        .status(403)
        .json({ error: "Access denied. Quiz is not available yet." });
    }

    res.json({ quiz });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
