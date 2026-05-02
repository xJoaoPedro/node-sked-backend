import { Router } from "express";
import AppointmentController from "../../controllers/appointment.controller.js";

const appointmentsRouter = Router();
const controller = new AppointmentController();

// GET /
appointmentsRouter.get("/", controller.findAll);

// GET /id
appointmentsRouter.get("/:id", controller.findOne);

// GET /id/date
appointmentsRouter.get("/:id/:date", controller.getAppointmentsByDate);

// POST /
appointmentsRouter.post("/", controller.create);

// PATCH /:id
appointmentsRouter.patch("/:id", controller.update);

// DELETE /:id
appointmentsRouter.delete("/:id", controller.delete);

export default appointmentsRouter;
