import express from "express";

const router = express.Router();

const JETSON_IP = process.env.JETSON_IP || "http://192.168.55.1";

router.get("/jetson-pose", async (req, res) => {
  try {
    const response = await fetch(`${JETSON_IP}/pose`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error talking to Jetson:", err);
    res.status(500).json({ error: "Failed to reach Jetson" });
  }
});

router.post("/jetson-servo", async (req, res) => {
  try {
    const { angle } = req.body;
    if (angle === undefined || angle < 0 || angle > 180) {
      return res.status(400).json({ error: "Angle must be between 0-180" });
    }
    
    const response = await fetch(`${JETSON_IP}/servo/${angle}`, {
      method: "POST"
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error controlling servo:", err);
    res.status(500).json({ error: "Failed to control servo" });
  }
});

export default router;
