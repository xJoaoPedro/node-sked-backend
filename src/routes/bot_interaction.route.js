import { Router } from "express";
import BotInteractionController from "../controllers/bot_interaction.controller.js";

const botInteractionsRouter = Router();
const controller = new BotInteractionController();

// GET /
botInteractionsRouter.get("/", controller.findAll);

// GET /id
botInteractionsRouter.get("/:id", controller.findOne);

// POST /
botInteractionsRouter.post("/", controller.create);

// PATCH /:id
botInteractionsRouter.patch("/:id", controller.update);

// DELETE /:id
botInteractionsRouter.delete("/:id", controller.delete);

export default botInteractionsRouter;
