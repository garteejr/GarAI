module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { prompt, size, style } = req.body || {};

  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt required" });
  }

  // Default values
  const finalStyle = style || "realistic";
  const finalSize = Math.min(Math.max(parseInt(size) || 1024, 256), 2048);

  try {
    const finalPrompt = `${finalStyle} style, ${prompt}, ultra quality, 8k, sharp details`;

    const url =
      `https://image.pollinations.ai/prompt/` +
      encodeURIComponent(finalPrompt) +
      `?width=${finalSize}&height=${finalSize}`;

    return res.json({ image: url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "Pollinations API Error",
      detail: error?.response?.data || error.message,
    });
  }
};
