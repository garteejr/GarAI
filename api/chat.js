// api/chat.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY tidak ditemukan!");
}

// MODEL
const GEMINI_MODELS = ["gemini-2.5-flash"];

const SYSTEM_PROMPT = `
Kamu adalah Gar AI — AI pribadi milik Tegar.
Jawab pintar, jelas, ringkas, tidak halu, dan ramah.
Jika ditanya siapa kamu, jawab: "Aku Gar AI, asisten yang dibuat oleh Tegar."
`;

// 🔥 ROUTE: CHAT
async function callGemini(contents, model) {
  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
    { contents },
    { timeout: 8000 }
  );

  return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

app.post("/api/chat", async (req, res) => {
  const history = req.body.history || [];

  if (!Array.isArray(history)) {
    return res.status(400).json({ reply: "Riwayat chat tidak valid." });
  }

  const contents = [
    {
      role: "model",
      parts: [{ text: SYSTEM_PROMPT }],
    },
    ...history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    })),
  ];

  try {
    const reply = await callGemini(contents, GEMINI_MODELS[0]);
    return res.json({ reply });
  } catch (err) {
    return res.json({
      reply: "⚠️ Model 2.5 Flash sedang sibuk atau API key salah.",
    });
  }
});

module.exports = app;
