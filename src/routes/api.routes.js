import { Router } from "express";
import usersRouter from "./api/users.route.js";
import companiesRouter from "./api/companies.route.js";
import companiesUsersRouter from "./api/companies_users.route.js";
import addressesRouter from "./api/addresses.route.js";
import scheduleOpeningsRouter from "./api/schedule_openings.route.js";
import scheduleBlocksRouter from "./api/schedule_blocks.route.js";
import servicesRouter from "./api/services.route.js";
import appointmentsRouter from "./api/appointments.route.js";
import botInteractionsRouter from "./api/bot_interaction.route.js";
import signaturesRouter from "./api/signatures.route.js";

const apiRouter = Router();

apiRouter.use("/users", usersRouter);
apiRouter.use("/companies", companiesRouter);
apiRouter.use("/companies-users", companiesUsersRouter);
apiRouter.use("/addresses", addressesRouter);
apiRouter.use("/schedule-openings", scheduleOpeningsRouter);
apiRouter.use("/schedule-blocks", scheduleBlocksRouter);
apiRouter.use("/services", servicesRouter);
apiRouter.use("/appointments", appointmentsRouter);
apiRouter.use("/bot-interactions", botInteractionsRouter);
apiRouter.use("/signatures", signaturesRouter);

export default apiRouter;