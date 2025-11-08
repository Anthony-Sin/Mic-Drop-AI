// server/index.js
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import transcribeRoute from '../routes/transcribe.js';
import scanroom from '../routes/scanroom.js';
import bannanao from '../routes/bananano.js'; 
import jetsonRoute from "../routes/jetson.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

app.use("/", jetsonRoute);
app.use('/api', transcribeRoute);
app.use('/api', scanroom);
app.use('/api', bannanao);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'homepage', 'homepage.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
