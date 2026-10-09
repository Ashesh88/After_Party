const truths = Array.from({ length: 50 }, (_, i) => `Truth question ${i + 1}`);
const dares = Array.from({ length: 50 }, (_, i) => `Dare action ${i + 1}`);

const getCard = (type) => {
  const deck = type === 'truth' ? truths : dares;
  const randomIndex = Math.floor(Math.random() * deck.length);
  return deck[randomIndex];
};

module.exports = {
  truths,
  dares,
  getCard,
};
