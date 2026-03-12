import "dotenv/config";
import server from './src/app.js';

const PORT = process.env.API_PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});