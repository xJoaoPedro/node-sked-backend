import { Router } from "express";
import CustomerController from "../../controllers/customer.controller.js";

const customersRouter = Router();
const controller = new CustomerController();

// POST /
customersRouter.post("/", controller.create);

export default customersRouter;
