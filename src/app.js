import express, { json } from "express";
import "dotenv/config";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import socketServer from "./socket.js";
import authRouter from "./routes/auth.route.js";
import apiRouter from "./routes/api.routes.js";
import { auth } from "./utils/authenticators/authenticator.js";
import cors from "cors";

const app = express();

app.use(cors({
  origin: process.env.CORS_URL,
  credentials: true,
}));

app.use(json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRouter);
app.use("/api", auth, apiRouter)

const server = createServer(app);
const socket = socketServer;
const io = socket.init(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/empresa/:id', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('Cliente conectado');

  socket.on('chat message', (msg) => {
    console.log('message: ' + msg);
  });

  io.send('Bem-vindo!');
});

export default server;
