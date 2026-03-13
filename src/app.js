import express, { json } from "express";
import "dotenv/config";
import usersRouter from "./routes/users.route.js";
import companiesRouter from "./routes/companies.route.js";
import companiesUsersRouter from "./routes/companies_users.route.js";
import addressesRouter from "./routes/addresses.route.js";
import scheduleOpeningsRouter from "./routes/schedule_openings.route.js";
import scheduleBlocksRouter from "./routes/schedule_blocks.route.js";
import servicesRouter from "./routes/services.route.js";
import appointmentsRouter from "./routes/appointments.route.js";
import botInteractionsRouter from "./routes/bot_interaction.route.js";
import signaturesRouter from "./routes/signatures.route.js";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import socketServer from "./socket.js";
import authRouter from "./routes/auth.route.js";
import { auth } from "./utils/authenticator.js";

const app = express();

app.use(json());
app.use(auth)
app.use(express.urlencoded({ extended: true }));

app.use("/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/companies-users", companiesUsersRouter);
app.use("/api/addresses", addressesRouter);
app.use("/api/schedule-openings", scheduleOpeningsRouter);
app.use("/api/schedule-blocks", scheduleBlocksRouter);
app.use("/api/services", servicesRouter);
app.use("/api/appointments", appointmentsRouter);
app.use("/api/bot-interactions", botInteractionsRouter);
app.use("/api/signatures", signaturesRouter);

const server = createServer(app)
const socket = socketServer;
const io = socket.init(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('chat message', (msg) => {
    console.log('message: ' + msg);
  });
});

export default server;
