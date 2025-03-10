const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Quiz = require("../models/Quiz");
const authenticateJWT = require("../middleware/authMiddleware"); // Middleware to verify token

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"; // Fallback to localhost

/**
 * @swagger
 * /quiz/save:
 *   post:
 *     summary: Create a new quiz
 *     description: Allows authenticated users to create a new quiz.
 *     tags:
 *       - Quizzes
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "General Knowledge Quiz"
 *               description:
 *                 type: string
 *                 example: "A quiz to test your general knowledge"
 *               category:
 *                 type: string
 *                 example: "Trivia"
 *               coverImage:
 *                 type: string
 *                 example: "https://example.com/image.png"
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionText:
 *                       type: string
 *                       example: "What is the capital of France?"
 *                     type:
 *                       type: string
 *                       enum: ["multiple-choice", "text"]
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Paris", "London", "Berlin"]
 *               timeLimit:
 *                 type: integer
 *                 example: 10
 *               maxAttemptsPerUser:
 *                 type: integer
 *                 example: 3
 *               totalScore:
 *                 type: integer
 *                 example: 100
 *               dateOpens:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-03-10T08:00:00.000Z"
 *               dateCloses:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-04-10T08:00:00.000Z"
 *               published:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Quiz created successfully.
 *       400:
 *         description: Validation error (e.g., missing required fields).
 *       401:
 *         description: Unauthorized (JWT missing or invalid).
 *       500:
 *         description: Internal server error.
 */
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
      creatorName: req.user.name,
      questions,
      timeLimit,
      maxAttemptsPerUser,
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

/**
 * @swagger
 * /quiz/edit/{quizId}:
 *   put:
 *     summary: Edit an existing quiz
 *     description: Allows the quiz creator to update an existing quiz. Cannot edit if the quiz has been attempted.
 *     tags:
 *       - Quizzes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the quiz to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Updated Quiz Title"
 *               description:
 *                 type: string
 *                 example: "Updated quiz description"
 *               category:
 *                 type: string
 *                 example: "Math"
 *               coverImage:
 *                 type: string
 *                 example: "https://example.com/updated-image.png"
 *               questions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionText:
 *                       type: string
 *                       example: "Updated question text?"
 *                     type:
 *                       type: string
 *                       enum: ["multiple-choice", "text"]
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Option A", "Option B"]
 *               timeLimit:
 *                 type: integer
 *                 example: 15
 *               maxAttemptsPerUser:
 *                 type: integer
 *                 example: 5
 *               totalScore:
 *                 type: integer
 *                 example: 120
 *               dateOpens:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-03-15T08:00:00.000Z"
 *               dateCloses:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-04-15T08:00:00.000Z"
 *               published:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Quiz updated successfully.
 *       400:
 *         description: Validation error (e.g., incorrect data format).
 *       401:
 *         description: Unauthorized (JWT missing or invalid).
 *       403:
 *         description: Forbidden (not the quiz creator or quiz has been attempted).
 *       404:
 *         description: Quiz not found.
 *       500:
 *         description: Internal server error.
 */
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

/**
 * @swagger
 * /quiz/delete/{quizId}:
 *   delete:
 *     summary: Delete a quiz
 *     description: Allows the quiz creator to delete their quiz if it has not been attempted.
 *     tags:
 *       - Quizzes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the quiz to delete.
 *     responses:
 *       200:
 *         description: Quiz deleted successfully.
 *       401:
 *         description: Unauthorized (JWT missing or invalid).
 *       403:
 *         description: Forbidden (not the quiz creator or quiz has been attempted).
 *       404:
 *         description: Quiz not found.
 *       500:
 *         description: Internal server error.
 */
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

/**
 * @swagger
 * /quiz/all:
 *   get:
 *     summary: Get all published quizzes
 *     description: Retrieve a paginated list of available quizzes that are published and open.
 *     tags:
 *       - Quizzes
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search for quizzes by title (case-insensitive).
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter quizzes by category.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Number of quizzes per page.
 *     responses:
 *       200:
 *         description: A paginated list of quizzes.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quizzes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "65d3f5a3c3e2b56a1a3b4c5d"
 *                       title:
 *                         type: string
 *                         example: "General Knowledge Quiz"
 *                       category:
 *                         type: string
 *                         example: "Trivia"
 *                       dateOpens:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-03-09T12:00:00.000Z"
 *                 totalPages:
 *                   type: integer
 *                   example: 5
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *       500:
 *         description: Internal server error.
 */
router.get("/all", async (req, res) => {
  try {
    const now = new Date();
    const { search, category, page = 1, limit = 6 } = req.query;

    const filters = {
      published: true,
      dateOpens: { $lte: now },
    };

    // Apply search filter (case-insensitive)
    if (search) {
      filters.title = { $regex: search, $options: "i" };
    }

    // Apply category filter
    if (category) {
      filters.category = category;
    }

    // Pagination settings
    const pageNumber = parseInt(page, 10) || 1;
    const pageSize = parseInt(limit, 10) || 6;
    const skip = (pageNumber - 1) * pageSize;

    const quizzes = await Quiz.find(filters)
      .select("-questions") // Exclude questions
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(pageSize);

    const totalQuizzes = await Quiz.countDocuments(filters);
    const totalPages = Math.ceil(totalQuizzes / pageSize);

    res.json({ quizzes, totalPages, currentPage: pageNumber });
  } catch (error) {
    console.error("Error fetching available quizzes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /quiz/my-quizzes:
 *   get:
 *     summary: Get quizzes created by the authenticated user
 *     description: Retrieve a list of quizzes created by the logged-in user. Requires authentication.
 *     tags:
 *       - Quizzes
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: A list of quizzes created by the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quizzes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "65d3f5a3c3e2b56a1a3b4c5d"
 *                       title:
 *                         type: string
 *                         example: "JavaScript Basics Quiz"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-03-09T12:00:00.000Z"
 *                       category:
 *                         type: string
 *                         example: "Programming"
 *       401:
 *         description: Unauthorized - User is not logged in or token is invalid.
 *       500:
 *         description: Internal server error.
 */
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

/**
 * @swagger
 * /quiz/details/{quizId}:
 *   get:
 *     summary: Get public details of a quiz
 *     description: Retrieve quiz details without questions. Only published quizzes that are open can be accessed.
 *     tags:
 *       - Quizzes
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the quiz to retrieve.
 *     responses:
 *       200:
 *         description: Quiz details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quiz:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "65d3f5a3c3e2b56a1a3b4c5d"
 *                     title:
 *                       type: string
 *                       example: "Science Trivia"
 *                     category:
 *                       type: string
 *                       example: "General Knowledge"
 *                     published:
 *                       type: boolean
 *                       example: true
 *                     dateOpens:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-03-10T08:00:00.000Z"
 *       403:
 *         description: Access denied - Quiz is not available yet.
 *       404:
 *         description: Quiz not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/details/:quizId", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId).select("-questions");
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    const now = new Date();
    if (!quiz.published || now < quiz.dateOpens) {
      return res
        .status(403)
        .json({ error: "Access denied. Quiz is not available yet." });
    }

    return res.json({ quiz });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /quiz/{quizId}:
 *   get:
 *     summary: Get full quiz details (requires authentication)
 *     description: Retrieve quiz details, including questions if the user is the creator. If the quiz is unpublished or not open yet, only the creator can access it.
 *     tags:
 *       - Quizzes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the quiz to retrieve.
 *     responses:
 *       200:
 *         description: Quiz details retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 quiz:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "65d3f5a3c3e2b56a1a3b4c5d"
 *                     title:
 *                       type: string
 *                       example: "Math Quiz"
 *                     createdBy:
 *                       type: string
 *                       example: "60d3f5a3c3e2b56a1a3b4c5d"
 *                     published:
 *                       type: boolean
 *                       example: true
 *                     dateOpens:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-03-10T08:00:00.000Z"
 *       202:
 *         description: Quiz retrieved but limited access (not the creator).
 *       403:
 *         description: Access denied - Quiz is not available yet.
 *       404:
 *         description: Quiz not found.
 *       500:
 *         description: Internal server error.
 */
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

    if (!isCreator) {
      res.set("Cache-Control", "no-store");
      return res.status(202).json({ quiz });
    }

    return res.json({ quiz });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
