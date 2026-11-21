require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { initSocket } = require('./socket');
const authRoutes = require('./routes/authRoutes');
const photoRoutes = require('./routes/photoRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined. Copy .env.example to .env and set it.');
  process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '100kb' }));

// Uploaded images are served statically; nosniff stops browsers from
// treating an uploaded file as anything other than an image.
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

app.get('/api/health', (_req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api', notFound);
app.use(errorHandler);

async function start() {
  await connectDB();
  const port = process.env.PORT || 5000;
  // Express and Socket.io share ONE http server (and therefore one port).
  const httpServer = http.createServer(app);
  initSocket(httpServer);
  httpServer.listen(port, () => console.log(`Alzikrayat API + Socket.io listening on http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

module.exports = app;
