import express from 'express';
import multer from 'multer';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

let speechClient = null;

try {
  const { SpeechClient } = await import('@google-cloud/speech');
  
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    speechClient = new SpeechClient({ credentials });
    console.log('✅ Google Speech initialized with JSON credentials');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    speechClient = new SpeechClient();
    console.log('✅ Google Speech initialized with file credentials');
  } else {
    console.warn('⚠️ No Google Cloud credentials found - transcribe disabled');
  }
} catch (err) {
  console.warn('⚠️ Google Speech not available:', err.message);
}

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!speechClient) {
      return res.status(500).json({ error: 'Speech service not configured' });
    }
    
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