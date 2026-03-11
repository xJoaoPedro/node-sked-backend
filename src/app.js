import express, { json } from "express";
import "dotenv/config";
import usersRouter from "./routes/users.route.js";
import companiesRouter from "./routes/companies.route.js";
import companiesUsersRouter from "./routes/companies_users.route.js";
import addressesRouter from "./routes/addresses.route.js";
import scheduleOpeningsRouter from "./routes/schedule_openings.route.js";

const app = express();

app.use(json());

app.use(express.urlencoded({ extended: true }));
app.use("/api/users", usersRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/companies-users", companiesUsersRouter);
app.use("/api/addresses", addressesRouter);
app.use("/api/schedule-openings", scheduleOpeningsRouter);

export default app;
