import express from 'express'
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config()
const router = express.Router();

const MODEL_ID = 'gemini-robotics-er-1.5-preview';
const genAI = new GoogleGenerativeAI(process.env.Gemini_API);

router.post('/analyze-image', async (req, res) => {
  try {
    const imagePath = path.join(__dirname, '../assets/testimg.jpg');
    const imageBytes = fs.readFileSync(imagePath);

    const prompt = `
        Identify and label anything in the room that contributes to a dirty or unprofessional appearance. This could include clutter, stains, trash, disorganized items, or anything visually distracting or out of place.

        Place a point on each such item or area, up to 16 points total.

        The points should be labeled in order of severity or visual impact, from '0' (most noticeable or problematic) to '15' (least noticeable).

        The answer should follow the JSON format:

        json
        [{"point": <point>, "label": <label>}]
        The points are in [y, x] format normalized to 0–1000.
    `;

    const model = genAI.getGenerativeModel({ model: MODEL_ID });
    const result = await model.generateContent([
      { inlineData: { mimeType: 'image/jpeg', data: imageBytes.toString('base64') } },
      prompt
    ], {
      generationConfig: { temperature: 0.5 }
    });

    const responseText = result?.text();
    res.json({ result: responseText });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({ error: 'Failed to process image.' });
  }
});

module.exports = router;
