import { Router } from "express";
import CustomerController from "../../controllers/customer.controller.js";

const customersRouter = Router();
const controller = new CustomerController();

// POST /
customersRouter.post("/", controller.create);

// PATCH /:id
customersRouter.patch("/:id", controller.update);

export default customersRouter;
