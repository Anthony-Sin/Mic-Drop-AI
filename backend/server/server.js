import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
dotenv.config()

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express()
app.use(express.static(
    path.join(
        __dirname, '..', '..', 'frontend'
    )
))

app.get('/', (req, res) => {
    res.sendFile(
        path.join(
        __dirname, '..', '..', 'frontend', 'demo', 'demo.html'
        )
    )
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Your page is at http://localhost:${port}`);
})
