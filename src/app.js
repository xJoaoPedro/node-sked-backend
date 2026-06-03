import express, { json } from "express";
import "dotenv/config";
import { createServer } from "node:http";
import socketServer from "./socket.js";
import authRouter from "./routes/auth.route.js";
import adminRouter from "./routes/admin.route.js";
import apiRouter from "./routes/api.routes.js";
import { auth } from "./utils/authenticators/authenticator.js";
import { enforceApprovedCompanyAccess } from "./utils/authenticators/company-approval.js";
import cors from "cors";
import BotInteractionController from "./controllers/bot_interaction.controller.js";
import { buildCorsOptions } from "./utils/cors.js";

const app = express();
const botInteractionController = new BotInteractionController();

app.use(cors(buildCorsOptions()));

app.use(json());
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.post("/webhooks/evolution", (req, res) => botInteractionController.handleEvolutionWebhook(req, res));
app.post("/webhooks/evolution/:event", (req, res) => botInteractionController.handleEvolutionWebhook(req, res));
app.use("/api", auth, enforceApprovedCompanyAccess, apiRouter);

const server = createServer(app);
socketServer.init(server);

export default server;
