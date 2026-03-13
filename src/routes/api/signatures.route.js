import { Router } from "express";
import SignatureController from "../../controllers/signature.controller.js";

const signaturesRouter = Router();
const controller = new SignatureController();

// GET /
signaturesRouter.get("/", controller.findAll);

// GET /id
signaturesRouter.get("/:id", controller.findOne);

// POST /
signaturesRouter.post("/", controller.create);

// PATCH /:id
signaturesRouter.patch("/:id", controller.update);

// DELETE /:id
signaturesRouter.delete("/:id", controller.delete);

export default signaturesRouter;
