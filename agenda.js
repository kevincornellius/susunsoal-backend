const Agenda = require("agenda");
const mongoose = require("mongoose");
const Attempt = require("./models/Attempt");
const Quiz = require("./models/Quiz");

const agenda = new Agenda({ db: { address: process.env.MONGO_URI } });

agenda.define("auto-submit attempt", async (job) => {
  const { attemptId } = job.attrs.data;

  try {
    const attempt = await Attempt.findById(attemptId).populate("quizId");

    if (!attempt) {
      console.log(`Attempt ${attemptId} not found.`);
      return;
    }

    if (attempt.status === "submitted") {
      console.log(`Attempt ${attemptId} already submitted.`);
      return;
    }

    const quiz = attempt.quizId;
    let score = 0;

    attempt.answers.forEach((ans) => {
      const question = quiz.questions.find(
        (q) => q._id.toString() === ans.questionId.toString()
      );
      if (question && question.correctAnswer === ans.selectedAnswer) {
        score++;
      }
    });

    attempt.status = "submitted";
    attempt.score = score;
    await attempt.save();

    quiz.totalScore += score;
    quiz.attemptCount += 1;
    await quiz.save();

    console.log(`Auto-submitted attempt ${attemptId}.`);
  } catch (error) {
    console.error(`Error auto-submitting attempt ${attemptId}:`, error);
  }
});

(async function () {
  await agenda.start();
  console.log("Agenda is running...");
})();

module.exports = agenda;
