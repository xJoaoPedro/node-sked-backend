import { Router } from "express";
import ProfessionalController from "../../controllers/professional.controller.js";

const professionalsRouter = Router();
const controller = new ProfessionalController();

// GET /
professionalsRouter.get("/", controller.findAll);

// GET /id
professionalsRouter.get("/:id", controller.findOne);

// POST /
professionalsRouter.post("/", controller.create);

// PATCH /:id
professionalsRouter.patch("/:id", controller.update);

// DELETE /:id
professionalsRouter.delete("/:id", controller.delete);

export default professionalsRouter;
