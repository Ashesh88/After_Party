const prompts = Array.from({ length: 40 }, (_, i) => ({
  id: `wyr${i + 1}`,
  optionA: `Option A for prompt ${i + 1}`,
  optionB: `Option B for prompt ${i + 1}`
}));

module.exports = {
  prompts,
};
