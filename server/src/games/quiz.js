const questions = Array.from({ length: 30 }, (_, i) => ({
  id: `q${i + 1}`,
  question: `How well do you know me question ${i + 1}?`,
  answerKey: `answer_${i + 1}`
}));

module.exports = {
  questions,
};
