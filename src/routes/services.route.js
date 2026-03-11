import { Router } from "express";
import ServiceController from "../controllers/service.controller.js";

const servicesRouter = Router();
const controller = new ServiceController();

// GET /
servicesRouter.get("/", controller.findAll);

// GET /id
servicesRouter.get("/:id", controller.findOne);

// POST /
servicesRouter.post("/", controller.create);

// PATCH /:id
servicesRouter.patch("/:id", controller.update);

// DELETE /:id
servicesRouter.delete("/:id", controller.delete);

export default servicesRouter;
