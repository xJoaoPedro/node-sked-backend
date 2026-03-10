import express, { json } from 'express';
import usersRouter from './routes/users.route.js';
import 'dotenv/config';

const app = express();

// Middleware to parse JSON bodies (necessary for POST/PUT requests with JSON data)
app.use(json());

app.use(express.urlencoded({ extended: true }));
app.use('/api/users', usersRouter);

export default app;
