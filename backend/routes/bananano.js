// routes/genimg.js
import express from 'express';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();

const router = express.Router();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 

router.post('/genimg', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt + ' Using the provided image ... professional setting.',
      config: { numberOfImages: 1 },
    });

    const base64Image = response.generatedImages[0].image.imageBytes;
    res.json({ image: base64Image });
  } catch (err) {
    console.error('Error generating content:', err);
    res.status(500).send('Internal server error');
  }
});

export default router;
