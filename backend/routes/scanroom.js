// routes/scanroom.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();
const MODEL_ID = 'gemini-robotics-er-1.5-preview';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 

router.post('/analyze-image', async (req, res) => {
  try {
    const imagePath = path.join(process.cwd(), 'assets', 'testimg.jpg');
    const imageBytes = fs.readFileSync(imagePath);

    const prompt = `Identify and label... JSON format: [{"point": <point>, "label": <label>}] ...`;

    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    const result = await model.generateContent([
      { inlineData: { mimeType: 'image/jpeg', data: imageBytes.toString('base64') } },
      prompt
    ], { generationConfig: { temperature: 0.5 } });

    const responseText = result?.text?.() ?? '';
    res.json({ result: responseText });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Failed to process image.' });
  }
});

export default router;
