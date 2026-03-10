import express, { json } from "express";
import "dotenv/config";
import usersRouter from "./routes/users.route.js";
import companiesRouter from "./routes/companies.route.js";

const app = express();

app.use(json());

app.use(express.urlencoded({ extended: true }));
app.use("/api/users", usersRouter);
app.use("/api/companies", companiesRouter);

export default app;
