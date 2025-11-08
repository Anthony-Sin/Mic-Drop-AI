import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/', (req, res) => {
  console.log('GET / called');
  res.json({ 
    status: 'online',
    message: 'Mic-Drop-AI API is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  console.log('GET /health called');
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

app.get('/test', (req, res) => {
  console.log('GET /test called');
  res.json({ message: 'Test endpoint works!' });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('='.repeat(50));
  console.log(`✅ SERVER IS RUNNING`);
  console.log(`📍 Host: ${HOST}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log('='.repeat(50));
});

console.log('Script started, attempting to start server...');