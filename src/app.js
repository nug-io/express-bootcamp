import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import requestLogger from './middlewares/requestLogger.js';
import errorHandler from './middlewares/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import batchRoutes from './routes/batch.routes.js';
import enrollmentRoutes from './routes/enrollment.routes.js';

import userRoutes from './routes/user.routes.js';
import materialRoutes from './routes/material.routes.js';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(requestLogger);

app.get(['/api', '/api/'], (req, res) => {
    res.json({ message: 'Bootcamp API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/material', materialRoutes);

app.use(errorHandler);

export default app;
