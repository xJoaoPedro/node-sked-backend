import express, { json } from "express";
import "dotenv/config";
import { createServer } from "node:http";
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
app.use("/api", auth, apiRouter);

const server = createServer(app);
socketServer.init(server);

export default server;
