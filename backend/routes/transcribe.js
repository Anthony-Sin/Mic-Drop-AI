import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { SpeechClient } from '@google-cloud/speech';
const router = express.Router();

const upload = multer({ dest: 'uploads/' }); 
const speechClient = new SpeechClient();

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const filePath = req.file.path;
    const audioBytes = fs.readFileSync(filePath).toString('base64');

    const request = {
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
      audio: { content: audioBytes },
    };

    const [response] = await speechClient.recognize(request);
    const transcription = (response.results || [])
      .map(r => r.alternatives?.[0]?.transcript || '')
      .join('\n');

    fs.unlinkSync(filePath);
    res.json({ transcription });
  } catch (error) {
    console.error('Error during transcription:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

export default router;
