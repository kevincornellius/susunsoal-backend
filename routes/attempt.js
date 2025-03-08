const express = require("express");
const Attempt = require("../models/Attempt");
const Quiz = require("../models/Quiz");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const agenda = require("../agenda");

//TODO
router.get("/:attemptId", authMiddleware, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user.id;
    const now = new Date();

    const attempt = await Attempt.findById(attemptId)
      .populate("quizId")
      .select("answers status startTime endTime userId quizId");

    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    if (attempt.userId.toString() !== userId)
      return res.status(403).json({ message: "Unauthorized" });

    // Auto-submit if time is up
    if (attempt.status === "in-progress" && now >= attempt.endTime) {
      console.log(`Auto-submitting expired attempt: ${attemptId}`);
      attempt.status = "submitted";
      attempt.score = calculateScore(attempt.answers, attempt.quizId);
      await attempt.save();
    }

    // **Debugging log**
    console.log("Fetched attempt:", JSON.stringify(attempt, null, 2));

    // **Ensure `answers` is included in response**
    res.status(200).json({
      attemptId: attempt._id,
      status: attempt.status,
      quiz: {
        title: attempt.quizId.title,
        timeLimit: attempt.quizId.timeLimit,
      },
      answers: attempt.answers ?? [], // Make sure answers is always included
      startTime: attempt.startTime,
      endTime: attempt.endTime,
      ...(attempt.status === "submitted" && { score: attempt.score }),
    });
  } catch (error) {
    console.error("Error fetching attempt:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/start", authMiddleware, async (req, res) => {
  try {
    const { quizId } = req.body;
    const userId = req.user._id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const now = new Date();
    const endTime = new Date(
      Math.min(
        quiz.dateCloses.getTime(),
        now.getTime() + quiz.timeLimit * 60000
      )
    );

    const attempt = new Attempt({
      userId,
      quizId,
      status: "in-progress",
      startTime: now,
      endTime,
    });

    await attempt.save();

    // Schedule auto-submit job
    await agenda.schedule(endTime, "auto-submit attempt", {
      attemptId: attempt._id,
    });

    res.status(201).json({ attempt, endTime });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/save", authMiddleware, async (req, res) => {
  try {
    const { attemptId, questionId, selectedAnswer } = req.body;
    const attempt = await Attempt.findById(attemptId);

    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status !== "in-progress")
      return res.status(400).json({ message: "Attempt already submitted" });

    const existingIndex = attempt.answers.findIndex(
      (ans) => ans.questionId.toString() === questionId
    );

    if (existingIndex >= 0) {
      attempt.answers[existingIndex].selectedAnswer = selectedAnswer;
    } else {
      attempt.answers.push({ questionId, selectedAnswer });
    }

    await attempt.save();

    res.json({ message: "Answer saved", attempt });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/submit", authMiddleware, async (req, res) => {
  try {
    const { attemptId } = req.body;
    const attempt = await Attempt.findById(attemptId).populate("quizId");

    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status === "submitted")
      return res.status(400).json({ message: "Attempt already submitted" });

    await agenda.cancel({ "data.attemptId": attemptId });

    const quiz = attempt.quizId;
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    attempt.status = "submitted";
    attempt.score = calculateScore(attempt.answers, quiz);
    await attempt.save();

    quiz.totalScore += attempt.score;
    quiz.attemptCount += 1;
    await quiz.save();

    res.json({ message: "Attempt submitted", attempt, quiz });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

const calculateScore = (answers, quiz) => {
  return quiz.questions.reduce((score, question) => {
    const userAnswer = answers.find(
      (ans) => ans.questionId.toString() === question._id.toString()
    );
    return userAnswer && userAnswer.selectedAnswer === question.correctAnswer
      ? score + 1
      : score;
  }, 0);
};

module.exports = router;
