import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { generateDescription } from "./gemini.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// =============================
// API: Generate Description
// =============================
app.post("/api/describe", async (req, res) => {
  const { type } = req.body;

  if (!type) {
    return res.status(400).json({
      error: "Jenis sampah tidak boleh kosong",
    });
  }

  const description = await generateDescription(type);

  res.json({
    type,
    description,
  });
});

// =============================
// Health check
// =============================
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server running" });
});

// =============================
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
