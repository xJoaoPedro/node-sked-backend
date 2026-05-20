import { Router } from "express";
import usersRouter from "./api/users.route.js";
import companiesRouter from "./api/companies.route.js";
import addressesRouter from "./api/addresses.route.js";
import scheduleOpeningsRouter from "./api/schedule_openings.route.js";
import scheduleBlocksRouter from "./api/schedule_blocks.route.js";
import servicesRouter from "./api/services.route.js";
import appointmentsRouter from "./api/appointments.route.js";
import botInteractionsRouter from "./api/bot_interaction.route.js";
import signaturesRouter from "./api/signatures.route.js";
import productsRouter from "./api/products.route.js";
import professionalsRouter from "./api/professionals.route.js";
import customersRouter from "./api/customers.route.js";
import {
  authorizeCompanyPayloadAccess,
  authorizeCompanyRouteAccess,
} from "../utils/authenticators/company-access.js";

const apiRouter = Router();

apiRouter.use("/companies/:id", authorizeCompanyRouteAccess);
apiRouter.use("/professionals", authorizeCompanyPayloadAccess, professionalsRouter);
apiRouter.use("/addresses", authorizeCompanyPayloadAccess, addressesRouter);
apiRouter.use("/schedule-openings", authorizeCompanyPayloadAccess, scheduleOpeningsRouter);
apiRouter.use("/schedule-blocks", authorizeCompanyPayloadAccess, scheduleBlocksRouter);
apiRouter.use("/services", authorizeCompanyPayloadAccess, servicesRouter);
apiRouter.use("/appointments", authorizeCompanyPayloadAccess, appointmentsRouter);
apiRouter.use("/bot-interactions", authorizeCompanyPayloadAccess, botInteractionsRouter);
apiRouter.use("/signatures", authorizeCompanyPayloadAccess, signaturesRouter);
apiRouter.use("/products", authorizeCompanyPayloadAccess, productsRouter);
apiRouter.use("/customers", authorizeCompanyPayloadAccess, customersRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/companies", companiesRouter);

export default apiRouter;
