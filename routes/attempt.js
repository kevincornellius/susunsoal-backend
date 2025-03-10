const express = require("express");
const Attempt = require("../models/Attempt");
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();
const agenda = require("../agenda");

/**
 * @swagger
 * /attempt/my-attempts:
 *   get:
 *     summary: Get all attempts of the logged-in user
 *     description: Retrieves all quiz attempts made by the authenticated user.
 *     tags:
 *       - Attempts
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Returns a list of attempts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 attempts:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error.
 */
router.get("/my-attempts", authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const attempts = await Attempt.find({ userId });

    res.json({ attempts });
  } catch (error) {
    console.error("Error fetching user attempts", error);
    res.status(500).json({ error: "Internal servaer error" });
  }
});

/**
 * @swagger
 * /attempt/submissions/{quizId}:
 *   get:
 *     summary: Get all attempts for a specific quiz
 *     description: Retrieves all attempts of a quiz, only accessible to the quiz creator.
 *     tags:
 *       - Attempts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the quiz.
 *     responses:
 *       200:
 *         description: Returns a list of attempts for the quiz.
 *       403:
 *         description: Unauthorized (user is not the quiz creator).
 *       404:
 *         description: Quiz not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/submissions/:quizId", authMiddleware, async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    if (quiz.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const attempts = await Attempt.find({ quizId });
    res.json({ attempts });
  } catch (error) {
    console.error("Error fetching  attempt", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /attempt/{attemptId}:
 *   get:
 *     summary: Get a specific quiz attempt
 *     description: Fetches a quiz attempt if it's submitted and the user has access.
 *     tags:
 *       - Attempts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the quiz attempt.
 *     responses:
 *       200:
 *         description: Returns the quiz attempt details.
 *       403:
 *         description: Unauthorized access.
 *       404:
 *         description: Attempt not found or quiz not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/:attemptId", authMiddleware, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const userId = req.user._id;

    // Find the attempt and populate quiz & answers
    const attempt = await Attempt.findById(attemptId);

    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status !== "submitted")
      return res.status(403).json({ message: "Attempt is not submitted yet" });

    const quiz = attempt.quizId;
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const attemptedQuiz = await Quiz.findById(quiz);
    if (!attemptedQuiz)
      return res.status(404).json({ message: "Quiz not found" });

    if (
      attempt.userId.toString() === userId.toString() ||
      attemptedQuiz.createdBy.toString() == userId.toString()
    ) {
      return res.json({
        attempt,
        attemptedQuiz,
        attemptorName: attempt.userName,
      });
    }

    return res.status(403).json("Unauthorized");
  } catch (error) {
    console.error("Error fetching  attempt", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /attempt/quiz/{quizId}:
 *   get:
 *     summary: Get an ongoing quiz attempt
 *     description: Fetches an in-progress quiz attempt for the logged-in user.
 *     tags:
 *       - Attempts
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the quiz.
 *     responses:
 *       200:
 *         description: Returns the ongoing quiz attempt.
 *       404:
 *         description: No in-progress attempt found.
 *       500:
 *         description: Internal server error.
 */
router.get("/quiz/:quizId", authMiddleware, async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    const attempt = await Attempt.findOne({
      userId,
      quizId,
      status: "in-progress",
    });

    if (!attempt) {
      return res
        .status(404)
        .json({ message: "in progress attempt does not exist" });
    }

    res.status(200).json(attempt);
  } catch (err) {
    console.error("Error fetching ongoing attempt:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * @swagger
 * /attempt/start:
 *   post:
 *     summary: Start a new quiz attempt
 *     description: Creates a new quiz attempt for the logged-in user.
 *     tags:
 *       - Attempts
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quizId:
 *                 type: string
 *                 description: The ID of the quiz.
 *     responses:
 *       201:
 *         description: Returns the newly created quiz attempt.
 *       404:
 *         description: Quiz not found.
 *       500:
 *         description: Internal server error.
 */
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
      quizTitle: quiz.title,
      userName: req.user.name,
      status: "in-progress",
      startTime: now,
      endTime,
    });
    await attempt.save();

    // Schedule auto-submit job
    await agenda.schedule(endTime, "auto-submit attempt", {
      attemptId: attempt._id,
    });

    res.status(201).json(attempt);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * @swagger
 * /attempt/save:
 *   post:
 *     summary: Save an answer during a quiz attempt
 *     description: Updates an in-progress quiz attempt with the selected answer.
 *     tags:
 *       - Attempts
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attemptId:
 *                 type: string
 *               questionId:
 *                 type: string
 *               selectedAnswer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Answer saved successfully.
 *       400:
 *         description: Attempt already submitted.
 *       404:
 *         description: Attempt not found.
 *       500:
 *         description: Internal server error.
 */
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
      if (selectedAnswer === "") {
        attempt.answers.splice(existingIndex, 1);
      } else {
        attempt.answers[existingIndex].selectedAnswer = selectedAnswer;
      }
    } else {
      if (selectedAnswer !== "") {
        attempt.answers.push({ questionId, selectedAnswer });
      }
    }
    console.log("Saved");

    await attempt.save();

    res.json({ message: "Answer saved", attempt });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/**
 * @swagger
 * /attempt/submit:
 *   post:
 *     summary: Submit a completed quiz attempt
 *     description: Marks a quiz attempt as submitted and calculates the score.
 *     tags:
 *       - Attempts
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               attemptId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Attempt submitted successfully.
 *       400:
 *         description: Attempt already submitted.
 *       404:
 *         description: Attempt or quiz not found.
 *       500:
 *         description: Internal server error.
 */
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
    console.log("Submit");
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
