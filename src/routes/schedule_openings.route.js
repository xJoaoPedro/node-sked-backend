import { Router } from "express";
import ScheduleOpeningController from "../controllers/schedule_opening.controller.js";

const scheduleOpeningsRouter = Router();
const controller = new ScheduleOpeningController();

// GET /
scheduleOpeningsRouter.get("/", controller.findAll);

// GET /id
scheduleOpeningsRouter.get("/:id", controller.findOne);

// POST /
scheduleOpeningsRouter.post("/", controller.create);

// PATCH /:id
scheduleOpeningsRouter.patch("/:id", controller.update);

// DELETE /:id
scheduleOpeningsRouter.delete("/:id", controller.delete);

export default scheduleOpeningsRouter;
