import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

let isReady = false;

app.get('/', (req, res) => {
  console.log('GET / - sending response');
  res.send('Server works!');
});

app.get('/health', (req, res) => {
  console.log('GET /health - sending response');
  if (!isReady) {
    return res.status(503).json({ status: 'starting' });
  }
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
  isReady = true;
  console.log('Server is ready!');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing server gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log('Starting server...');