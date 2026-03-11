import { Router } from "express";
import ScheduleBlockController from "../controllers/schedule_block.controller.js";

const scheduleBlocksRouter = Router();
const controller = new ScheduleBlockController();

// GET /
scheduleBlocksRouter.get("/", controller.findAll);

// GET /id
scheduleBlocksRouter.get("/:id", controller.findOne);

// POST /
scheduleBlocksRouter.post("/", controller.create);

// PATCH /:id
scheduleBlocksRouter.patch("/:id", controller.update);

// DELETE /:id
scheduleBlocksRouter.delete("/:id", controller.delete);

export default scheduleBlocksRouter;
