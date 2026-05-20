import { Router } from "express";
import BotInteractionController from "../../controllers/bot_interaction.controller.js";

const botInteractionsRouter = Router();
const controller = new BotInteractionController();

botInteractionsRouter.post("/evolution/instance", controller.createEvolutionInstance);
botInteractionsRouter.post("/evolution/instance/connect", controller.connectEvolutionInstance);
botInteractionsRouter.get("/evolution/instance/status", controller.evolutionConnectionState);
botInteractionsRouter.post("/evolution/message/text", controller.sendEvolutionText);

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
