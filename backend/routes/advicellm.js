import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
dotenv.config();

const router = express.Router();
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aimodel = "gemini-2.5-flash"

router.post('/advice', async (req, res) => {
    try{
        contents: [{ role: 'user', parts: [{ text: data }] }]
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Explain how AI works in a few words", contents,
        });
        res.json(response.text);
    }catch(error){
        console.log('you have a server error', error)
        res.status(500).send({ message: 'Internal server error', error: error.message });
    }
})
