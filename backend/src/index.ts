import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDatabase } from './config/database';
import routes from './routes';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3001',
  'https://rentalsoft.onrender.com',
  'https://rental-soft-three.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

app.options('*', cors());
app.use(express.json());

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

async function start() {
  await connectDatabase();
  
  app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port}`);
    console.log(`📍 API: http://localhost:${config.port}/api`);
  });
}

start();
