const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { SpeechClient } = require('@google-cloud/speech');

const app = express();
const port = 3000;

const upload = multer({ dest: 'uploads/' });

const speechClient = new SpeechClient();

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const audioBytes = fs.readFileSync(filePath).toString('base64');

    const request = {
      config: {
        encoding: 'LINEAR16', 
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
      audio: {
        content: audioBytes,
      },
    };

    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    fs.unlinkSync(filePath);

    res.json({ transcription });
  } catch (error) {
    console.error('Error during transcription:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
