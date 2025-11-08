import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import transcribeRoute from '../routes/transcribe.js';
import scanroom from '../routes/scanroom.js';
import bannanao from '../routes/bananano.js'; 
import jetsonRoute from "../routes/jetson.js";

dotenv.config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.json({ 
    status: 'online',
    service: 'Mic-Drop-AI API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      pose: '/api/jetson-pose',
      servo: '/api/jetson-servo',
      transcribe: '/api/transcribe',
      scanroom: '/api/analyze-image',
      genimg: '/api/genimg'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api', jetsonRoute);
app.use('/api', transcribeRoute);
app.use('/api', scanroom);
app.use('/api', bannanao);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message 
  });
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 Mic-Drop-AI API Server Running   ║
╠════════════════════════════════════════╣
║  Port: ${PORT}                       
║  Host: ${HOST}                    
║  Env:  ${process.env.NODE_ENV || 'development'}              
╚════════════════════════════════════════╝
  `);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});