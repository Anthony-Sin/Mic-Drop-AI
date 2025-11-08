import express from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import * as fs from "node:fs";
dotenv.config()
const router = express.Router();

const MODEL_ID = 'imagen-4.0-generate-001';
const ai = new GoogleGenerativeAI(process.env.Gemini_API);


router.post('/genimg', async (req, res) => {
    try{
        const {prompt} = req.body;
        
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt + 'Using the provided image of this person, create a professional version of the same individual. Style them in a confident, business-appropriate outfit. Give them a neat, well-groomed haircut. Place them in a clean, minimal, and professional-looking background suitable for a presentation or corporate setting.',
            config: {
            numberOfImages: 1,
            },
        });
        const base64Image = response.generatedImages[0].image.imageBytes;
        res.json({ image: base64Image });
        
    }
    catch(err){
        console.error('Error generating content:', err)
        res.status(500).send('Internal server error')
    }
})

export default router;
