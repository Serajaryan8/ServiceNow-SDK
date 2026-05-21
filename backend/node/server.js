import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Route matches React call
app.post("/api/query", async (req, res) => {
  try {
    // Forward to Python backend
    const response = await fetch("http://127.0.0.1:7000/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("❌ Error forwarding request:", error);
    res.status(500).json({ error: "Failed to connect to Python AI backend" });
  }
});

app.listen(5000, () => console.log("🚀 Node server running on http://127.0.0.1:5000"));
