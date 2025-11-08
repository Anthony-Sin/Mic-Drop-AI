import express from "express";

const router = express.Router();

const JETSON_IP = "http://192.168.55.1/pose";

router.get("/jetson-pose", async (req, res) => {
  try {
    const response = await fetch(JETSON_IP);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error talking to Jetson:", err);
    res.status(500).json({ error: "Failed to reach Jetson" });
  }
});

export default router;
