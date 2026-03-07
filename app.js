import express, { json } from 'express';
import 'dotenv/config';

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware to parse JSON bodies (necessary for POST/PUT requests with JSON data)
app.use(json());

// A simple GET route for the home page
app.get('/', (req, res) => {
  res.send('Hello World! This is a simple API response.');
});

// A GET route that returns JSON data
app.get('/api/status', (req, res) => {
  res.json({
    status: 'Running',
    timestamp: new Date().toISOString()
  });
});

// A GET route with a dynamic parameter (e.g., /api/users/1)
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  // In a real API, you would fetch user data from a database here
  res.json({
    message: `Retrieving user with ID: ${userId}`,
    id: userId
  });
});

console.log(PORT)
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
})